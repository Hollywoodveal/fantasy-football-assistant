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
}

export type DraftDataSet = {
  schemaVersion: 1
  sourceName: string
  season: number
  scoring: ScoringFormat
  importedAt: string
  players: DraftPlayer[]
}

export type RankingImportIssue = {
  lineNumber: number
  message: string
}

export type RankingImportResult = {
  dataSet: DraftDataSet | null
  issues: RankingImportIssue[]
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
