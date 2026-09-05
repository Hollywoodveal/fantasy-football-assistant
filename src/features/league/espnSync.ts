import type { ImportedPlayer, LeagueProfile, PlayerPosition, ScoringFormat } from './types'

type EspnScoringItem = {
  statId?: number
  points?: number
}

type EspnPlayer = {
  id?: number
  fullName?: string
  defaultPositionId?: number
  proTeamId?: number
}

type EspnRosterEntry = {
  lineupSlotId?: number
  playerId?: number
  playerPoolEntry?: {
    player?: EspnPlayer
  }
}

type EspnTeam = {
  id?: number
  name?: string
  location?: string
  nickname?: string
  abbreviation?: string
  roster?: {
    entries?: EspnRosterEntry[]
  }
}

export type EspnLeagueDocument = {
  id?: number
  seasonId?: number
  scoringPeriodId?: number
  settings?: {
    name?: string
    size?: number
    scoringSettings?: {
      scoringItems?: EspnScoringItem[]
    }
  }
  teams?: EspnTeam[]
}

export type EspnSyncedTeam = {
  id: number
  name: string
  abbreviation: string
  roster: ImportedPlayer[]
}

export type EspnLeagueSync = {
  schemaVersion: 1
  provider: 'espn'
  access: 'public-read-only'
  leagueId: string
  leagueName: string
  season: number
  scoringPeriodId: number
  scoring: ScoringFormat
  teamCount: number
  teams: EspnSyncedTeam[]
  syncedAt: string
}

const positionById: Partial<Record<number, PlayerPosition>> = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'D/ST',
}

const nflTeamById: Record<number, string> = {
  0: 'FA',
  1: 'ATL',
  2: 'BUF',
  3: 'CHI',
  4: 'CIN',
  5: 'CLE',
  6: 'DAL',
  7: 'DEN',
  8: 'DET',
  9: 'GB',
  10: 'TEN',
  11: 'IND',
  12: 'KC',
  13: 'LV',
  14: 'LAR',
  15: 'MIA',
  16: 'MIN',
  17: 'NE',
  18: 'NO',
  19: 'NYG',
  20: 'NYJ',
  21: 'PHI',
  22: 'ARI',
  23: 'PIT',
  24: 'LAC',
  25: 'SF',
  26: 'SEA',
  27: 'TB',
  28: 'WAS',
  29: 'CAR',
  30: 'JAX',
  33: 'BAL',
  34: 'HOU',
}

const benchSlotId = 20
const injuredReserveSlotId = 21
const receptionsStatId = 53

export function validateEspnSyncInput(leagueId: string | null, seasonValue: string | null, currentYear = new Date().getUTCFullYear()) {
  const normalizedLeagueId = leagueId?.trim() ?? ''
  const season = Number(seasonValue)
  if (!/^\d{1,20}$/.test(normalizedLeagueId)) throw new Error('Enter a valid numeric ESPN League ID.')
  if (!Number.isInteger(season) || season < currentYear - 2 || season > currentYear + 1) {
    throw new Error(`Choose an ESPN season between ${currentYear - 2} and ${currentYear + 1}.`)
  }
  return { leagueId: normalizedLeagueId, season }
}

export function buildEspnLeagueUrl(leagueId: string, season: number) {
  const url = new URL(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`)
  ;['mSettings', 'mTeam', 'mRoster'].forEach((view) => url.searchParams.append('view', view))
  return url.toString()
}

function cleanText(value: string | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function teamName(team: EspnTeam) {
  return cleanText(team.name) || cleanText(`${team.location ?? ''} ${team.nickname ?? ''}`) || `ESPN Team ${team.id ?? ''}`.trim()
}

function scoringFormat(document: EspnLeagueDocument): ScoringFormat {
  const receptionPoints = document.settings?.scoringSettings?.scoringItems
    ?.find((item) => item.statId === receptionsStatId)?.points ?? 0
  if (receptionPoints >= 0.75) return 'PPR'
  if (receptionPoints >= 0.25) return 'Half PPR'
  return 'Standard'
}

function rosterSlot(lineupSlotId: number | undefined) {
  if (lineupSlotId === injuredReserveSlotId) return 'IR' as const
  if (lineupSlotId === benchSlotId) return 'Bench' as const
  return 'Starter' as const
}

function rosterPlayer(entry: EspnRosterEntry): ImportedPlayer | null {
  const player = entry.playerPoolEntry?.player
  const position = player?.defaultPositionId ? positionById[player.defaultPositionId] : undefined
  const name = cleanText(player?.fullName)
  if (!player || !position || !name) return null

  const playerId = player.id ?? entry.playerId
  return {
    id: `espn-${playerId ?? `${position}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}`,
    name,
    position,
    nflTeam: nflTeamById[player.proTeamId ?? 0] ?? 'FA',
    slot: rosterSlot(entry.lineupSlotId),
  }
}

export function parseEspnLeague(document: EspnLeagueDocument, requestedLeagueId: string, requestedSeason: number, syncedAt = new Date().toISOString()): EspnLeagueSync {
  const teams = (document.teams ?? []).flatMap((team) => {
    if (!Number.isInteger(team.id)) return []
    const seen = new Set<string>()
    const roster = (team.roster?.entries ?? []).flatMap((entry) => {
      const player = rosterPlayer(entry)
      if (!player || seen.has(player.id)) return []
      seen.add(player.id)
      return [player]
    })
    return [{
      id: team.id as number,
      name: teamName(team),
      abbreviation: cleanText(team.abbreviation).toUpperCase(),
      roster,
    }]
  }).sort((first, second) => first.name.localeCompare(second.name))

  if (!teams.length) throw new Error('ESPN returned no teams for this league.')

  return {
    schemaVersion: 1,
    provider: 'espn',
    access: 'public-read-only',
    leagueId: String(document.id ?? requestedLeagueId),
    leagueName: cleanText(document.settings?.name) || 'ESPN Fantasy League',
    season: document.seasonId ?? requestedSeason,
    scoringPeriodId: document.scoringPeriodId ?? 0,
    scoring: scoringFormat(document),
    teamCount: document.settings?.size ?? teams.length,
    teams,
    syncedAt,
  }
}

export function profileFromEspnLeague(league: EspnLeagueSync, teamId: number): LeagueProfile {
  const team = league.teams.find((candidate) => candidate.id === teamId)
  if (!team) throw new Error('Choose a team from the synced ESPN league.')
  if (!team.roster.length) throw new Error('ESPN returned no supported players for this team.')

  return {
    schemaVersion: 1,
    platform: 'espn',
    leagueId: league.leagueId,
    leagueName: league.leagueName,
    teamName: team.name,
    season: league.season,
    scoring: league.scoring,
    teamCount: league.teamCount,
    roster: team.roster,
    importedAt: league.syncedAt,
    sync: {
      mode: 'espn-public',
      teamId,
      scoringPeriodId: league.scoringPeriodId,
      lastSyncedAt: league.syncedAt,
    },
  }
}

export async function fetchPublicEspnLeague(leagueId: string, season: number): Promise<EspnLeagueSync> {
  const query = new URLSearchParams({ leagueId, season: String(season) })
  const response = await fetch(`/api/espn/league?${query}`, { headers: { Accept: 'application/json' } })
  const body = await response.json().catch(() => null) as EspnLeagueSync | { message?: string } | null
  if (!response.ok) throw new Error(body && 'message' in body && body.message ? body.message : 'ESPN league sync failed. Try manual import instead.')
  return body as EspnLeagueSync
}
