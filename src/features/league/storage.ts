import { playerPositions, rosterSlots, scoringFormats, type LeagueProfile } from './types'

const storageKey = 'fantasy-assistant:league-profile:v1'

function isLeagueProfile(value: unknown): value is LeagueProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<LeagueProfile>

  return profile.schemaVersion === 1
    && profile.platform === 'espn'
    && typeof profile.leagueName === 'string'
    && typeof profile.teamName === 'string'
    && typeof profile.leagueId === 'string'
    && typeof profile.season === 'number'
    && typeof profile.teamCount === 'number'
    && scoringFormats.some((format) => format === profile.scoring)
    && Array.isArray(profile.roster)
    && profile.roster.every((player) => (
      player
      && typeof player.id === 'string'
      && typeof player.name === 'string'
      && typeof player.nflTeam === 'string'
      && playerPositions.some((position) => position === player.position)
      && rosterSlots.some((slot) => slot === player.slot)
    ))
    && typeof profile.importedAt === 'string'
}

export function loadLeagueProfile(): LeagueProfile | null {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return null
    const parsed: unknown = JSON.parse(stored)
    return isLeagueProfile(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveLeagueProfile(profile: LeagueProfile) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(profile))
    return true
  } catch {
    return false
  }
}
