import type { PlayerPosition, RosterSlot } from '../league/types'

export type WeeklyGameStatus = 'scheduled' | 'in-progress' | 'final' | 'bye' | 'unknown'
export type WeeklyAvailability = 'active' | 'questionable' | 'doubtful' | 'out' | 'unknown'
export type WeeklyConfidence = 'high' | 'medium' | 'low'

export type WeeklyPlayerIntelligence = {
  playerId: string
  providerPlayerId: string
  name: string
  position: PlayerPosition
  nflTeam: string
  rosterSlot: RosterSlot
  projectedPoints?: number
  actualPoints?: number
  injuryStatus: string
  availability: WeeklyAvailability
  opponent?: string
  homeAway?: 'home' | 'away'
  kickoff?: string
  gameStatus: WeeklyGameStatus
  confidence: WeeklyConfidence
}

export type WeeklyIntelligenceResponse = {
  schemaVersion: 1
  provider: {
    id: 'espn-public-weekly'
    name: 'ESPN public weekly data'
    access: 'read-only'
  }
  leagueId: string
  teamId: number
  season: number
  week: number
  refreshedAt: string
  players: WeeklyPlayerIntelligence[]
  coverage: {
    rosterPlayers: number
    projectedPlayers: number
    statusPlayers: number
    scheduledPlayers: number
  }
}

type EspnWeeklyStat = {
  scoringPeriodId?: number
  statSourceId?: number
  appliedTotal?: number
}

type EspnWeeklyPlayer = {
  id?: number
  fullName?: string
  defaultPositionId?: number
  proTeamId?: number
  injuryStatus?: string
  stats?: EspnWeeklyStat[]
}

type EspnWeeklyRosterEntry = {
  lineupSlotId?: number
  playerId?: number
  playerPoolEntry?: {
    player?: EspnWeeklyPlayer
  }
}

export type EspnWeeklyLeagueDocument = {
  id?: number
  teams?: Array<{
    id?: number
    roster?: {
      entries?: EspnWeeklyRosterEntry[]
    }
  }>
}

type EspnScoreboardCompetitor = {
  homeAway?: 'home' | 'away'
  team?: {
    abbreviation?: string
  }
}

export type EspnScoreboardDocument = {
  events?: Array<{
    date?: string
    status?: {
      type?: {
        state?: string
        completed?: boolean
      }
    }
    competitions?: Array<{
      date?: string
      competitors?: EspnScoreboardCompetitor[]
      status?: {
        type?: {
          state?: string
          completed?: boolean
        }
      }
    }>
  }>
}

type TeamGame = {
  opponent: string
  homeAway: 'home' | 'away'
  kickoff?: string
  gameStatus: Exclude<WeeklyGameStatus, 'bye' | 'unknown'>
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
  0: 'FA', 1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN',
  8: 'DET', 9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA',
  16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT',
  24: 'LAC', 25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
}

const teamAliases: Record<string, string> = {
  JAC: 'JAX',
  WSH: 'WAS',
}

const benchSlotId = 20
const injuredReserveSlotId = 21
const storagePrefix = 'fantasy-assistant:weekly-intelligence:v1'

function normalizeTeam(team: string | undefined) {
  const abbreviation = team?.trim().toUpperCase() ?? ''
  return teamAliases[abbreviation] ?? abbreviation
}

function rosterSlot(lineupSlotId: number | undefined): RosterSlot {
  if (lineupSlotId === injuredReserveSlotId) return 'IR'
  if (lineupSlotId === benchSlotId) return 'Bench'
  return 'Starter'
}

function finitePoints(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : undefined
}

function weeklyPoints(stats: EspnWeeklyStat[] | undefined, week: number, sourceId: number) {
  const exact = stats?.find((stat) => stat.scoringPeriodId === week && stat.statSourceId === sourceId)
  return finitePoints(exact?.appliedTotal)
}

export function normalizeAvailability(injuryStatus: string | undefined): WeeklyAvailability {
  const status = injuryStatus?.trim().toUpperCase().replace(/[ -]+/g, '_') ?? ''
  if (!status || status === 'ACTIVE' || status === 'NORMAL') return status ? 'active' : 'unknown'
  if (status === 'QUESTIONABLE') return 'questionable'
  if (status === 'DOUBTFUL') return 'doubtful'
  if (['OUT', 'INJURY_RESERVE', 'INJURED_RESERVE', 'IR', 'PUP', 'SUSPENSION', 'SUSPENDED'].includes(status)) return 'out'
  return 'unknown'
}

function gameStatus(state: string | undefined, completed: boolean | undefined) {
  if (completed || state === 'post') return 'final' as const
  if (state === 'in') return 'in-progress' as const
  return 'scheduled' as const
}

export function parseEspnSchedule(document: EspnScoreboardDocument | undefined) {
  const schedule = new Map<string, TeamGame>()
  document?.events?.forEach((event) => {
    const competition = event.competitions?.[0]
    const competitors = competition?.competitors ?? []
    if (competitors.length < 2) return
    competitors.forEach((competitor) => {
      const team = normalizeTeam(competitor.team?.abbreviation)
      const opponent = normalizeTeam(competitors.find((candidate) => candidate !== competitor)?.team?.abbreviation)
      if (!team || !opponent || !competitor.homeAway) return
      const status = competition?.status?.type ?? event.status?.type
      schedule.set(team, {
        opponent,
        homeAway: competitor.homeAway,
        kickoff: competition?.date ?? event.date,
        gameStatus: gameStatus(status?.state, status?.completed),
      })
    })
  })
  return schedule
}

export function validateWeeklyIntelligenceInput(
  leagueId: string | null,
  seasonValue: string | null,
  weekValue: string | null,
  teamIdValue: string | null,
  currentYear = new Date().getUTCFullYear(),
) {
  const normalizedLeagueId = leagueId?.trim() ?? ''
  const season = Number(seasonValue)
  const week = Number(weekValue)
  const teamId = Number(teamIdValue)
  if (!/^\d{1,20}$/.test(normalizedLeagueId)) throw new Error('Enter a valid numeric ESPN League ID.')
  if (!Number.isInteger(season) || season < currentYear - 2 || season > currentYear + 1) throw new Error('Choose a valid ESPN season.')
  if (!Number.isInteger(week) || week < 1 || week > 18) throw new Error('Choose an NFL week between 1 and 18.')
  if (!Number.isInteger(teamId) || teamId < 1) throw new Error('Choose a valid ESPN team.')
  return { leagueId: normalizedLeagueId, season, week, teamId }
}

export function buildEspnWeeklyLeagueUrl(leagueId: string, season: number, week: number) {
  const url = new URL(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`)
  url.searchParams.set('scoringPeriodId', String(week))
  ;['mRoster', 'mMatchup', 'mStatus'].forEach((view) => url.searchParams.append('view', view))
  return url.toString()
}

export function buildEspnScoreboardUrl(season: number, week: number) {
  const url = new URL('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
  url.searchParams.set('dates', String(season))
  url.searchParams.set('seasontype', '2')
  url.searchParams.set('week', String(week))
  url.searchParams.set('limit', '100')
  return url.toString()
}

export function parseWeeklyIntelligence(
  league: EspnWeeklyLeagueDocument,
  scoreboard: EspnScoreboardDocument | undefined,
  input: { leagueId: string; season: number; week: number; teamId: number },
  refreshedAt = new Date().toISOString(),
): WeeklyIntelligenceResponse {
  const team = league.teams?.find((candidate) => candidate.id === input.teamId)
  if (!team) throw new Error('ESPN returned no matching team for this league.')
  const schedule = parseEspnSchedule(scoreboard)
  const seen = new Set<string>()
  const players = (team.roster?.entries ?? []).flatMap((entry) => {
    const player = entry.playerPoolEntry?.player
    const providerPlayerId = String(player?.id ?? entry.playerId ?? '')
    const position = player?.defaultPositionId ? positionById[player.defaultPositionId] : undefined
    const name = player?.fullName?.trim() ?? ''
    if (!providerPlayerId || !position || !name || seen.has(providerPlayerId)) return []
    seen.add(providerPlayerId)
    const nflTeam = nflTeamById[player?.proTeamId ?? 0] ?? 'FA'
    const game = schedule.get(nflTeam)
    const projectedPoints = weeklyPoints(player?.stats, input.week, 1)
    const actualPoints = weeklyPoints(player?.stats, input.week, 0)
    const injuryStatus = player?.injuryStatus?.trim() ?? ''
    const availability = normalizeAvailability(injuryStatus)
    const hasStatus = availability !== 'unknown'
    const confidence: WeeklyConfidence = projectedPoints !== undefined && game
      ? 'high'
      : projectedPoints !== undefined || game || hasStatus ? 'medium' : 'low'

    return [{
      playerId: `espn-${providerPlayerId}`,
      providerPlayerId,
      name,
      position,
      nflTeam,
      rosterSlot: rosterSlot(entry.lineupSlotId),
      projectedPoints,
      actualPoints,
      injuryStatus,
      availability,
      opponent: game?.opponent,
      homeAway: game?.homeAway,
      kickoff: game?.kickoff,
      gameStatus: game?.gameStatus ?? (nflTeam === 'FA' || !scoreboard ? 'unknown' : 'bye'),
      confidence,
    } satisfies WeeklyPlayerIntelligence]
  })

  if (!players.length) throw new Error('ESPN returned no supported roster players for this team.')

  return {
    schemaVersion: 1,
    provider: { id: 'espn-public-weekly', name: 'ESPN public weekly data', access: 'read-only' },
    leagueId: String(league.id ?? input.leagueId),
    teamId: input.teamId,
    season: input.season,
    week: input.week,
    refreshedAt,
    players,
    coverage: {
      rosterPlayers: players.length,
      projectedPlayers: players.filter((player) => player.projectedPoints !== undefined).length,
      statusPlayers: players.filter((player) => player.availability !== 'unknown').length,
      scheduledPlayers: players.filter((player) => player.opponent).length,
    },
  }
}

function storageKey(input: { leagueId: string; teamId: number; season: number; week: number }) {
  return `${storagePrefix}:${input.leagueId}:${input.teamId}:${input.season}:${input.week}`
}

function isWeeklyIntelligence(value: unknown): value is WeeklyIntelligenceResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WeeklyIntelligenceResponse>
  return candidate.schemaVersion === 1
    && candidate.provider?.id === 'espn-public-weekly'
    && typeof candidate.leagueId === 'string'
    && typeof candidate.teamId === 'number'
    && typeof candidate.season === 'number'
    && typeof candidate.week === 'number'
    && typeof candidate.refreshedAt === 'string'
    && Array.isArray(candidate.players)
    && Boolean(candidate.coverage)
}

export function loadWeeklyIntelligence(input: { leagueId: string; teamId: number; season: number; week: number }) {
  try {
    const raw = window.localStorage.getItem(storageKey(input))
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isWeeklyIntelligence(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveWeeklyIntelligence(data: WeeklyIntelligenceResponse) {
  try {
    window.localStorage.setItem(storageKey(data), JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export async function fetchWeeklyIntelligence(
  input: { leagueId: string; teamId: number; season: number; week: number },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    leagueId: input.leagueId,
    teamId: String(input.teamId),
    season: String(input.season),
    week: String(input.week),
  })
  const response = await fetch(`/api/espn/weekly-intelligence?${query}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  const body = await response.json().catch(() => null) as WeeklyIntelligenceResponse | { message?: string } | null
  if (!response.ok) {
    throw new Error(body && 'message' in body && body.message
      ? body.message
      : 'Weekly ESPN data is unavailable. Saved roster estimates remain active.')
  }
  return body as WeeklyIntelligenceResponse
}
