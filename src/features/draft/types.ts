import type { ScoringFormat } from '../league/types'

export const draftPositions = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'D/ST', 'K', 'BENCH'] as const
export type DraftPosition = (typeof draftPositions)[number]
export type PlayerPosition = Exclude<DraftPosition, 'FLEX' | 'BENCH'>

export type DraftPlayer = {
  id: string
  name: string
  position: PlayerPosition
  nflTeam: string
  bye: number
  projectedPoints: number
  adp: number
  tier: number
  notes: string
  providerPlayerId?: string
  availabilityStatus?: string
  injuryStatus?: string
  liveUpdatedAt?: string
}

export type DraftDataSet = {
  schemaVersion: 3
  sourceName: string
  season: number
  scoring: ScoringFormat
  importedAt: string
  players: DraftPlayer[]
  importSummary?: RankingImportSummary
  liveData?: LiveDataSummary
}

export type LiveDataSummary = {
  schemaVersion: 1
  providerId: 'sleeper'
  providerName: string
  season: number
  week: number
  seasonType: string
  refreshedAt: string
  matchedPlayers: number
  providerPlayers: number
}

export type LivePlayerRecord = {
  providerPlayerId: string
  name: string
  position: PlayerPosition
  nflTeam: string
  availabilityStatus: string
  injuryStatus: string
}

export type LivePlayerDataResponse = {
  schemaVersion: 1
  provider: {
    id: 'sleeper'
    name: string
    usage: string
  }
  season: number
  week: number
  seasonType: string
  refreshedAt: string
  players: LivePlayerRecord[]
}

export type RankingImportIssue = {
  lineNumber: number
  message: string
  severity: 'warning' | 'error'
  suggestion?: string
}

export type RankingImportSummary = {
  format?: 'delimited' | 'espn-pdf'
  delimiter: 'comma' | 'tab' | 'pipe'
  mappedColumns: string[]
  projectionCount: number
  positionCounts: Partial<Record<PlayerPosition, number>>
}

export type RankingImportResult = {
  dataSet: DraftDataSet | null
  issues: RankingImportIssue[]
}

export type DraftBoardPreferences = {
  schemaVersion: 1
  favorites: string[]
  notes: Record<string, string>
}

export type DraftSettings = {
  schemaVersion: 1
  leagueName: string
  teamName: string
  teamCount: number
  scoring: ScoringFormat
  draftPosition: number
  rosterSlots: Record<DraftPosition, number>
}

export type DraftPick = {
  playerId: string
  pickNumber: number
  draftedBy: 'mine' | 'other'
  draftedAt: string
}

export type DraftSession = {
  schemaVersion: 1
  settings: DraftSettings
  picks: DraftPick[]
  startedAt: string
  updatedAt: string
}

export type Recommendation = {
  player: DraftPlayer
  score: number
  reasons: string[]
}
