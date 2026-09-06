import { draftPlayers } from '../draft/players.ts'
import type { ImportedPlayer, PlayerPosition, ScoringFormat } from '../league/types'
import type { WeeklyPlayerIntelligence } from './weeklyIntelligence.ts'

export const lineupSlots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'D/ST', 'K'] as const
export type LineupSlot = (typeof lineupSlots)[number]
export type LineupRosterSource = 'espn' | 'preview'
export type AssignmentSource = 'starter' | 'bench' | 'empty'

export type LineupPlayer = ImportedPlayer & {
  projectedPoints: number
  projectionSource: 'espn-weekly' | 'ranking' | 'estimate'
  actualPoints?: number
  injuryStatus?: string
  availability?: WeeklyPlayerIntelligence['availability']
  opponent?: string
  homeAway?: WeeklyPlayerIntelligence['homeAway']
  kickoff?: string
  gameStatus?: WeeklyPlayerIntelligence['gameStatus']
  confidence?: WeeklyPlayerIntelligence['confidence']
  unavailable: boolean
}

export type LineupAssignment = {
  slot: LineupSlot
  player: LineupPlayer | null
  source: AssignmentSource
  projectedPoints: number
}

export type LineupSwap = {
  id: string
  position: PlayerPosition
  slot: LineupSlot
  starter: LineupPlayer | null
  bench: LineupPlayer
  gain: number
  reason: string
}

export type LineupOptimization = {
  current: LineupAssignment[]
  optimized: LineupAssignment[]
  swaps: LineupSwap[]
  currentPoints: number
  optimizedPoints: number
  projectedGain: number
  warnings: string[]
  rosterSource: LineupRosterSource
}

const weeklyBaselines: Record<PlayerPosition, number> = {
  QB: 17.5,
  RB: 13.5,
  WR: 13,
  TE: 10.5,
  K: 8.5,
  'D/ST': 7.5,
}

const normalizedName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

function stableOffset(name: string) {
  return [...name].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 17, 0) / 10
}

function estimateWeeklyPoints(player: ImportedPlayer, scoring: ScoringFormat): Pick<LineupPlayer, 'projectedPoints' | 'projectionSource'> {
  const ranking = draftPlayers.find((candidate) => normalizedName(candidate.name) === normalizedName(player.name))
  if (ranking) {
    const scoringAdjustment = scoring === 'PPR' ? 0.25 : scoring === 'Standard' ? -0.2 : 0
    return {
      projectedPoints: Math.round(((ranking.projectedPoints / 17) + scoringAdjustment) * 10) / 10,
      projectionSource: 'ranking',
    }
  }

  return {
    projectedPoints: Math.round((weeklyBaselines[player.position] + stableOffset(player.name)) * 10) / 10,
    projectionSource: 'estimate',
  }
}

export function enrichRoster(
  roster: ImportedPlayer[],
  scoring: ScoringFormat = 'PPR',
  weeklyIntelligence: WeeklyPlayerIntelligence[] = [],
): LineupPlayer[] {
  const intelligenceByPlayer = new Map(weeklyIntelligence.map((player) => [player.playerId, player]))
  return roster.map((player) => {
    const estimate = estimateWeeklyPoints(player, scoring)
    const intelligence = intelligenceByPlayer.get(player.id)
    const unavailable = intelligence?.availability === 'out' || intelligence?.gameStatus === 'bye'
    const hasWeeklyProjection = intelligence?.projectedPoints !== undefined
    return {
      ...player,
      ...estimate,
      ...(intelligence ? {
        actualPoints: intelligence.actualPoints,
        injuryStatus: intelligence.injuryStatus,
        availability: intelligence.availability,
        opponent: intelligence.opponent,
        homeAway: intelligence.homeAway,
        kickoff: intelligence.kickoff,
        gameStatus: intelligence.gameStatus,
        confidence: intelligence.confidence,
      } : {}),
      projectedPoints: unavailable ? 0 : hasWeeklyProjection ? intelligence.projectedPoints as number : estimate.projectedPoints,
      projectionSource: hasWeeklyProjection ? 'espn-weekly' : estimate.projectionSource,
      unavailable,
    }
  })
}

function supportsSlot(player: LineupPlayer, slot: LineupSlot) {
  return slot === 'FLEX'
    ? player.position === 'RB' || player.position === 'WR' || player.position === 'TE'
    : player.position === slot
}

function assignBest(players: LineupPlayer[], slots: readonly LineupSlot[]): LineupAssignment[] {
  const remaining = [...players]
  const assignments: LineupAssignment[] = []

  slots.forEach((slot) => {
    const player = remaining
      .filter((candidate) => supportsSlot(candidate, slot))
      .sort((first, second) => second.projectedPoints - first.projectedPoints || first.name.localeCompare(second.name))[0] ?? null

    if (player) {
      remaining.splice(remaining.findIndex((candidate) => candidate.id === player.id), 1)
    }

    assignments.push({
      slot,
      player,
      source: player ? (player.slot === 'Starter' ? 'starter' : 'bench') : 'empty',
      projectedPoints: player?.projectedPoints ?? 0,
    })
  })

  return assignments
}

function assignmentPoints(assignments: LineupAssignment[]) {
  return Math.round(assignments.reduce((total, assignment) => total + assignment.projectedPoints, 0) * 10) / 10
}

function bestLineup(players: LineupPlayer[]) {
  const fixedSlots = lineupSlots.filter((slot) => slot !== 'FLEX')
  const fixedAssignments = assignBest(players, fixedSlots)
  const usedIds = new Set(fixedAssignments.flatMap((assignment) => assignment.player ? [assignment.player.id] : []))
  const flex = players
    .filter((player) => supportsSlot(player, 'FLEX') && !usedIds.has(player.id))
    .sort((first, second) => second.projectedPoints - first.projectedPoints || first.name.localeCompare(second.name))[0] ?? null

  const flexAssignment: LineupAssignment = {
    slot: 'FLEX',
    player: flex,
    source: flex ? (flex.slot === 'Starter' ? 'starter' : 'bench') : 'empty',
    projectedPoints: flex?.projectedPoints ?? 0,
  }

  return [...fixedAssignments.slice(0, 6), flexAssignment, ...fixedAssignments.slice(6)]
}

function findSwaps(current: LineupAssignment[], optimized: LineupAssignment[]) {
  return optimized.flatMap((assignment, index) => {
    const previous = current[index]
    const player = assignment.player
    if (!player || assignment.source !== 'bench' || previous?.player?.id === player.id) return []

    const gain = Math.round((assignment.projectedPoints - (previous?.projectedPoints ?? 0)) * 10) / 10
    if (gain <= 0) return []

    return [{
      id: `${assignment.slot}-${player.id}`,
      position: player.position,
      slot: assignment.slot,
      starter: previous?.player ?? null,
      bench: player,
      gain,
      reason: previous?.player
        ? player.projectionSource === 'espn-weekly' ? 'Higher ESPN weekly projection' : 'Higher local projection'
        : 'Fills an open lineup slot',
    }]
  })
}

export function optimizeLineup(
  roster: ImportedPlayer[],
  options: {
    scoring?: ScoringFormat
    rosterSource?: LineupRosterSource
    weeklyIntelligence?: WeeklyPlayerIntelligence[]
  } = {},
): LineupOptimization {
  const scoring = options.scoring ?? 'PPR'
  const rosterSource = options.rosterSource ?? 'espn'
  const players = enrichRoster(roster.filter((player) => player.slot !== 'IR'), scoring, options.weeklyIntelligence)
  const starters = players.filter((player) => player.slot === 'Starter')
  const current = bestLineup(starters)
  const optimized = bestLineup(players.filter((player) => !player.unavailable))
  const swaps = findSwaps(current, optimized)
  const warnings: string[] = []

  lineupSlots.forEach((slot, index) => {
    if (!optimized[index]?.player) warnings.push(`No eligible ${slot} available in this roster.`)
  })

  const irCount = roster.filter((player) => player.slot === 'IR').length
  if (irCount > 0) warnings.push(`${irCount} IR ${irCount === 1 ? 'player is' : 'players are'} excluded from this week's optimizer.`)
  const outCount = players.filter((player) => player.availability === 'out').length
  if (outCount > 0) warnings.push(`${outCount} unavailable ${outCount === 1 ? 'player is' : 'players are'} excluded from the optimized lineup.`)
  const byeCount = players.filter((player) => player.gameStatus === 'bye').length
  if (byeCount > 0) warnings.push(`${byeCount} ${byeCount === 1 ? 'player has' : 'players have'} a bye and ${byeCount === 1 ? 'is' : 'are'} excluded from the optimized lineup.`)
  players
    .filter((player) => player.availability === 'questionable' || player.availability === 'doubtful')
    .forEach((player) => warnings.push(`${player.name} is ${player.availability}; verify status before kickoff.`))
  if (roster.length === 0) warnings.push('No roster players are loaded yet. Import an ESPN-compatible roster to replace this preview.')

  const currentPoints = assignmentPoints(current)
  const optimizedPoints = assignmentPoints(optimized)
  return {
    current,
    optimized,
    swaps,
    currentPoints,
    optimizedPoints,
    projectedGain: Math.round((optimizedPoints - currentPoints) * 10) / 10,
    warnings,
    rosterSource,
  }
}
