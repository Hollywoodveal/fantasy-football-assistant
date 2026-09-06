import {
  parseEspnLeague,
  validateEspnSyncInput,
  type EspnLeagueDocument,
} from '../league/espnSync.ts'
import type { PlayerPosition } from '../league/types.ts'

export type WaiverClaimRules = {
  mode: 'faab' | 'priority'
  budgetTotal?: number
  budgetSpent?: number
  budgetRemaining?: number
  waiverRank?: number
}

export type EspnRosteredPlayer = {
  providerPlayerId: string
  name: string
  position: PlayerPosition
  nflTeam: string
  fantasyTeamId: number
  fantasyTeamName: string
}

export type WaiverAvailabilityInput = {
  leagueId: string
  season: number
  teamId: number
}

export type WaiverAvailabilityResponse = {
  schemaVersion: 1
  provider: {
    id: 'espn-public-rosters'
    name: 'ESPN public league rosters'
    access: 'read-only'
  }
  leagueId: string
  leagueName: string
  season: number
  teamId: number
  refreshedAt: string
  coverage: {
    teams: number
    rosteredPlayers: number
  }
  rosteredPlayers: EspnRosteredPlayer[]
  claimRules: WaiverClaimRules
}

const STORAGE_PREFIX = 'fantasy-assistant-waiver-availability-v1'

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function validateWaiverAvailabilityInput(
  leagueId: string | null,
  seasonValue: string | number | null,
  teamIdValue: string | number | null,
  currentYear = new Date().getUTCFullYear(),
): WaiverAvailabilityInput {
  const league = validateEspnSyncInput(leagueId, String(seasonValue ?? ''), currentYear)
  const teamId = Number(teamIdValue)
  if (!Number.isInteger(teamId) || teamId <= 0) throw new Error('Choose a valid ESPN fantasy team.')
  return { ...league, teamId }
}

export function parseEspnWaiverAvailability(
  document: EspnLeagueDocument,
  input: WaiverAvailabilityInput,
  refreshedAt = new Date().toISOString(),
): WaiverAvailabilityResponse {
  const league = parseEspnLeague(document, input.leagueId, input.season, refreshedAt)
  const sourceTeams = document.teams ?? []
  if (league.teams.length !== league.teamCount || sourceTeams.some((team) => !Array.isArray(team.roster?.entries))) {
    throw new Error('ESPN did not return a complete roster snapshot for every fantasy team.')
  }
  const selectedTeam = document.teams?.find((team) => team.id === input.teamId)
  if (!selectedTeam) throw new Error('ESPN did not return the selected fantasy team.')

  const rosteredPlayers = new Map<string, EspnRosteredPlayer>()
  league.teams.forEach((team) => {
    team.roster.forEach((player) => {
      const providerPlayerId = player.id.startsWith('espn-') ? player.id.slice(5) : player.id
      const key = `${providerPlayerId}:${player.position}`
      if (rosteredPlayers.has(key)) return
      rosteredPlayers.set(key, {
        providerPlayerId,
        name: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        fantasyTeamId: team.id,
        fantasyTeamName: team.name,
      })
    })
  })

  const acquisition = document.settings?.acquisitionSettings
  const budgetTotal = finiteNumber(acquisition?.acquisitionBudget)
  const budgetSpent = finiteNumber(selectedTeam.transactionCounter?.acquisitionBudgetSpent)
  const budgetRemaining = budgetTotal === undefined
    ? undefined
    : Math.max(0, budgetTotal - (budgetSpent ?? 0))
  const waiverRank = finiteNumber(selectedTeam.waiverRank)
  const claimRules: WaiverClaimRules = acquisition?.isUsingAcquisitionBudget
    ? {
        mode: 'faab',
        ...(budgetTotal === undefined ? {} : { budgetTotal }),
        ...(budgetSpent === undefined ? {} : { budgetSpent }),
        ...(budgetRemaining === undefined ? {} : { budgetRemaining }),
        ...(waiverRank === undefined ? {} : { waiverRank }),
      }
    : {
        mode: 'priority',
        ...(waiverRank === undefined ? {} : { waiverRank }),
      }

  const players = [...rosteredPlayers.values()].sort((first, second) =>
    first.name.localeCompare(second.name)
      || first.position.localeCompare(second.position)
      || first.fantasyTeamId - second.fantasyTeamId,
  )

  return {
    schemaVersion: 1,
    provider: {
      id: 'espn-public-rosters',
      name: 'ESPN public league rosters',
      access: 'read-only',
    },
    leagueId: league.leagueId,
    leagueName: league.leagueName,
    season: league.season,
    teamId: input.teamId,
    refreshedAt,
    coverage: {
      teams: league.teams.length,
      rosteredPlayers: players.length,
    },
    rosteredPlayers: players,
    claimRules,
  }
}

function storageKey(input: WaiverAvailabilityInput) {
  return `${STORAGE_PREFIX}:${input.leagueId}:${input.season}:${input.teamId}`
}

function matchesInput(value: unknown, input: WaiverAvailabilityInput): value is WaiverAvailabilityResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WaiverAvailabilityResponse>
  return candidate.schemaVersion === 1
    && candidate.leagueId === input.leagueId
    && candidate.season === input.season
    && candidate.teamId === input.teamId
    && typeof candidate.refreshedAt === 'string'
    && Number.isFinite(Date.parse(candidate.refreshedAt))
    && Array.isArray(candidate.rosteredPlayers)
    && candidate.claimRules?.mode !== undefined
}

export function loadWaiverAvailability(input: WaiverAvailabilityInput) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(input)) ?? 'null')
    return matchesInput(parsed, input) ? parsed : null
  } catch {
    return null
  }
}

export function saveWaiverAvailability(value: WaiverAvailabilityResponse) {
  try {
    localStorage.setItem(storageKey(value), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export async function fetchWaiverAvailability(
  input: WaiverAvailabilityInput,
  signal?: AbortSignal,
  forceRefresh = false,
): Promise<WaiverAvailabilityResponse> {
  const query = new URLSearchParams({
    leagueId: input.leagueId,
    season: String(input.season),
    teamId: String(input.teamId),
    ...(forceRefresh ? { refresh: '1' } : {}),
  })
  const response = await fetch(`/api/espn/waiver-availability?${query}`, {
    cache: forceRefresh ? 'no-store' : 'default',
    headers: { Accept: 'application/json' },
    signal,
  })
  const body = await response.json().catch(() => null) as WaiverAvailabilityResponse | { message?: string } | null
  if (!response.ok) {
    throw new Error(body && 'message' in body && body.message
      ? body.message
      : 'ESPN roster availability could not be verified. The candidate board remains available with unverified labels.')
  }
  if (!matchesInput(body, input)) throw new Error('ESPN returned an unsupported waiver-availability response.')
  return body
}
