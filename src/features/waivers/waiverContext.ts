import { buildEspnScoreboardUrl, parseEspnSchedule, type EspnScoreboardDocument, type WeeklyGameStatus } from '../lineup/weeklyIntelligence.ts'

export type WaiverTeamContext = {
  team: string
  opponent: string
  homeAway: 'home' | 'away'
  kickoff?: string
  gameStatus: Exclude<WeeklyGameStatus, 'bye' | 'unknown'>
}

export type WaiverWeekContextResponse = {
  schemaVersion: 1
  provider: {
    id: 'espn-public-nfl-schedule'
    name: 'ESPN public NFL schedule'
    access: 'read-only'
  }
  season: number
  week: number
  refreshedAt: string
  teams: WaiverTeamContext[]
}

const storagePrefix = 'fantasy-assistant:waiver-week-context:v1'

export function validateWaiverWeekContextInput(
  seasonValue: string | number | null,
  weekValue: string | number | null,
  currentYear = new Date().getUTCFullYear(),
) {
  const season = Number(seasonValue)
  const week = Number(weekValue)
  if (!Number.isInteger(season) || season < currentYear - 2 || season > currentYear + 1) {
    throw new Error('Choose a valid NFL season.')
  }
  if (!Number.isInteger(week) || week < 1 || week > 18) {
    throw new Error('Choose an NFL week between 1 and 18.')
  }
  return { season, week }
}

export function parseWaiverWeekContext(
  scoreboard: EspnScoreboardDocument,
  input: { season: number; week: number },
  refreshedAt = new Date().toISOString(),
): WaiverWeekContextResponse {
  const teams = [...parseEspnSchedule(scoreboard)].map(([team, game]) => ({ team, ...game }))
    .sort((first, second) => first.team.localeCompare(second.team))
  if (!teams.length) throw new Error('ESPN returned no NFL matchups for this week.')

  return {
    schemaVersion: 1,
    provider: {
      id: 'espn-public-nfl-schedule',
      name: 'ESPN public NFL schedule',
      access: 'read-only',
    },
    season: input.season,
    week: input.week,
    refreshedAt,
    teams,
  }
}

function storageKey(input: { season: number; week: number }) {
  return `${storagePrefix}:${input.season}:${input.week}`
}

function matchesInput(value: unknown, input: { season: number; week: number }): value is WaiverWeekContextResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WaiverWeekContextResponse>
  return candidate.schemaVersion === 1
    && candidate.provider?.id === 'espn-public-nfl-schedule'
    && candidate.season === input.season
    && candidate.week === input.week
    && typeof candidate.refreshedAt === 'string'
    && Number.isFinite(Date.parse(candidate.refreshedAt))
    && Array.isArray(candidate.teams)
}

export function loadWaiverWeekContext(input: { season: number; week: number }) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(input)) ?? 'null')
    return matchesInput(parsed, input) ? parsed : null
  } catch {
    return null
  }
}

export function saveWaiverWeekContext(value: WaiverWeekContextResponse) {
  try {
    localStorage.setItem(storageKey(value), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export async function fetchWaiverWeekContext(
  input: { season: number; week: number },
  signal?: AbortSignal,
): Promise<WaiverWeekContextResponse> {
  const query = new URLSearchParams({ season: String(input.season), week: String(input.week) })
  const response = await fetch(`/api/nfl/waiver-context?${query}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  const body = await response.json().catch(() => null) as WaiverWeekContextResponse | { message?: string } | null
  if (!response.ok) {
    throw new Error(body && 'message' in body && body.message
      ? body.message
      : 'Weekly matchup context is temporarily unavailable. Local waiver rankings remain active.')
  }
  if (!matchesInput(body, input)) throw new Error('The weekly matchup response was not recognized.')
  return body
}

export { buildEspnScoreboardUrl }
