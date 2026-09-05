export const playerPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'] as const

export const rosterSlots = ['Starter', 'Bench', 'IR'] as const

export const scoringFormats = ['PPR', 'Half PPR', 'Standard'] as const

export type PlayerPosition = (typeof playerPositions)[number]
export type RosterSlot = (typeof rosterSlots)[number]
export type ScoringFormat = (typeof scoringFormats)[number]

export type ImportedPlayer = {
  id: string
  name: string
  position: PlayerPosition
  nflTeam: string
  slot: RosterSlot
}

export type EspnPublicSync = {
  mode: 'espn-public'
  teamId: number
  scoringPeriodId: number
  lastSyncedAt: string
}

export type LeagueProfile = {
  schemaVersion: 1
  platform: 'espn'
  leagueId: string
  leagueName: string
  teamName: string
  season: number
  scoring: ScoringFormat
  teamCount: number
  roster: ImportedPlayer[]
  importedAt: string
  sync?: EspnPublicSync
}

export type RosterParseError = {
  lineNumber: number
  source: string
  message: string
}

export type RosterParseResult = {
  players: ImportedPlayer[]
  errors: RosterParseError[]
}
