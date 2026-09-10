import type { ImportedPlayer, PlayerPosition } from '../league/types.ts'
import type { EspnRosteredPlayer } from './waiverAvailability.ts'
import type { WaiverClaimPlanItem } from './waiverEngine.ts'

export type WaiverOutcomeStatus = 'pending' | 'won' | 'lost' | 'skipped'

export type WaiverClaimSnapshot = {
  playerId: string
  name: string
  position: PlayerPosition
  nflTeam: string
  dropName: string | null
  order: number
  strategyLabel: string
  projectedGain: number
  status: WaiverOutcomeStatus
  resolvedAt?: string
}

export type WaiverRosterMove = Pick<ImportedPlayer, 'id' | 'name' | 'position' | 'nflTeam' | 'slot'>

export type WaiverContinuityRecord = {
  schemaVersion: 1
  id: string
  leagueId: string
  teamId: number
  season: number
  week: number
  syncedAt: string
  verification: 'all-rosters' | 'selected-roster-only'
  added: WaiverRosterMove[]
  dropped: WaiverRosterMove[]
  claims: WaiverClaimSnapshot[]
  faabSpent?: number
  lineupRefreshRequired: boolean
}

export type WaiverReconciliationInput = {
  leagueId: string
  teamId: number
  season: number
  week: number
  syncedAt: string
  previousRoster: ImportedPlayer[]
  currentRoster: ImportedPlayer[]
  claimPlan: WaiverClaimPlanItem[]
  rosteredPlayers?: EspnRosteredPlayer[]
  previousFaabRemaining?: number
  currentFaabRemaining?: number
}

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function playerKey(player: Pick<ImportedPlayer, 'id' | 'name' | 'position' | 'nflTeam'>) {
  if (player.id.startsWith('espn-')) return `id:${player.id.slice(5)}`
  if (player.position === 'D/ST' && player.nflTeam && player.nflTeam !== 'FA') return `dst:${player.nflTeam.toUpperCase()}`
  return `name:${normalizeName(player.name)}:${player.position}`
}

function claimMatchesPlayer(
  claim: Pick<WaiverClaimSnapshot, 'name' | 'position' | 'nflTeam'>,
  player: Pick<ImportedPlayer, 'name' | 'position' | 'nflTeam'>,
) {
  if (claim.position !== player.position) return false
  if (claim.position === 'D/ST' && claim.nflTeam !== 'FA' && player.nflTeam !== 'FA') {
    return claim.nflTeam.toUpperCase() === player.nflTeam.toUpperCase()
  }
  return normalizeName(claim.name) === normalizeName(player.name)
}

function claimMatchesRosteredPlayer(
  claim: Pick<WaiverClaimSnapshot, 'name' | 'position' | 'nflTeam'>,
  player: Pick<EspnRosteredPlayer, 'name' | 'position' | 'nflTeam'>,
) {
  return claimMatchesPlayer(claim, player)
}

export function snapshotClaimPlan(claimPlan: WaiverClaimPlanItem[]): WaiverClaimSnapshot[] {
  return claimPlan.map((item) => ({
    playerId: item.recommendation.candidate.id,
    name: item.recommendation.candidate.name,
    position: item.recommendation.candidate.position,
    nflTeam: item.recommendation.candidate.nflTeam,
    dropName: item.recommendation.drop?.name ?? null,
    order: item.order,
    strategyLabel: item.strategyLabel,
    projectedGain: item.recommendation.projectedGain,
    status: 'pending',
  }))
}

export function diffRosters(previousRoster: ImportedPlayer[], currentRoster: ImportedPlayer[]) {
  const previousByKey = new Map(previousRoster.map((player) => [playerKey(player), player]))
  const currentByKey = new Map(currentRoster.map((player) => [playerKey(player), player]))
  const added = [...currentByKey.entries()].flatMap(([key, player]) => previousByKey.has(key) ? [] : [player])
  const dropped = [...previousByKey.entries()].flatMap(([key, player]) => currentByKey.has(key) ? [] : [player])
  return { added, dropped }
}

export function reconcileWaiverResults(input: WaiverReconciliationInput): WaiverContinuityRecord {
  const { added, dropped } = diffRosters(input.previousRoster, input.currentRoster)
  const rosteredPlayers = input.rosteredPlayers
  const claims = snapshotClaimPlan(input.claimPlan).map((claim) => {
    if (input.currentRoster.some((player) => claimMatchesPlayer(claim, player))) {
      return { ...claim, status: 'won' as const, resolvedAt: input.syncedAt }
    }
    if (rosteredPlayers?.some((player) => player.fantasyTeamId !== input.teamId && claimMatchesRosteredPlayer(claim, player))) {
      return { ...claim, status: 'lost' as const, resolvedAt: input.syncedAt }
    }
    return claim
  })
  const previousFaab = input.previousFaabRemaining
  const currentFaab = input.currentFaabRemaining
  const faabSpent = previousFaab !== undefined && currentFaab !== undefined
    ? Math.max(0, previousFaab - currentFaab)
    : undefined

  return {
    schemaVersion: 1,
    id: `${input.leagueId}:${input.season}:${input.week}`,
    leagueId: input.leagueId,
    teamId: input.teamId,
    season: input.season,
    week: input.week,
    syncedAt: input.syncedAt,
    verification: rosteredPlayers ? 'all-rosters' : 'selected-roster-only',
    added,
    dropped,
    claims,
    ...(faabSpent === undefined ? {} : { faabSpent }),
    lineupRefreshRequired: added.length > 0 || dropped.length > 0,
  }
}

export function markWaiverClaimSkipped(record: WaiverContinuityRecord, playerId: string, resolvedAt = new Date().toISOString()) {
  return {
    ...record,
    syncedAt: resolvedAt,
    claims: record.claims.map((claim) => claim.playerId === playerId && claim.status === 'pending'
      ? { ...claim, status: 'skipped' as const, resolvedAt }
      : claim),
  }
}

export function mergeContinuityRecord(previous: WaiverContinuityRecord | undefined, next: WaiverContinuityRecord) {
  if (!previous) return next
  const previousClaims = new Map(previous.claims.map((claim) => [claim.playerId, claim]))
  const nextClaimIds = new Set(next.claims.map((claim) => claim.playerId))
  const mergeMoves = (earlier: WaiverRosterMove[], current: WaiverRosterMove[]) => {
    const moves = new Map(earlier.map((player) => [playerKey(player), player]))
    current.forEach((player) => moves.set(playerKey(player), player))
    return [...moves.values()]
  }
  return {
    ...next,
    verification: previous.verification === 'all-rosters' || next.verification === 'all-rosters'
      ? 'all-rosters' as const
      : 'selected-roster-only' as const,
    added: mergeMoves(previous.added, next.added),
    dropped: mergeMoves(previous.dropped, next.dropped),
    claims: [
      ...next.claims.map((claim) => {
        const earlier = previousClaims.get(claim.playerId)
        return earlier && earlier.status !== 'pending' && claim.status === 'pending' ? earlier : claim
      }),
      ...previous.claims.filter((claim) => !nextClaimIds.has(claim.playerId) && claim.status !== 'pending'),
    ].sort((first, second) => first.order - second.order || first.name.localeCompare(second.name)),
    ...(previous.faabSpent === undefined && next.faabSpent === undefined
      ? {}
      : { faabSpent: (previous.faabSpent ?? 0) + (next.faabSpent ?? 0) }),
    lineupRefreshRequired: previous.lineupRefreshRequired || next.lineupRefreshRequired,
  }
}
