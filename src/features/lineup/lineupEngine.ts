import { draftPlayers } from '../draft/players.ts'
import type { ImportedPlayer, PlayerPosition, ScoringFormat } from '../league/types'
import type { WeeklyPlayerIntelligence } from './weeklyIntelligence.ts'

export const lineupSlots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'D/ST', 'K'] as const
export type LineupSlot = (typeof lineupSlots)[number]
export type LineupRosterSource = 'espn' | 'preview'
export type AssignmentSource = 'starter' | 'bench' | 'empty'
export type MatchupOutlook = 'favorable' | 'neutral' | 'tough' | 'unknown'
export type RiskLevel = 'low' | 'medium' | 'high'

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
  localProjection: number
  matchupOutlook: MatchupOutlook
  matchupDelta: number
  riskScore: number
  riskLevel: RiskLevel
  riskFactors: string[]
  floorPoints: number
  ceilingPoints: number
  decisionScore: number
  decisionSummary: string
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
  decisionGain: number
  floorGain: number
  riskImprovement: number
  reason: string
  reasons: string[]
}

export type LineupOptimization = {
  current: LineupAssignment[]
  optimized: LineupAssignment[]
  swaps: LineupSwap[]
  currentPoints: number
  optimizedPoints: number
  projectedGain: number
  currentFloor: number
  optimizedFloor: number
  currentCeiling: number
  optimizedCeiling: number
  currentRisk: number
  optimizedRisk: number
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

const positionVolatility: Record<PlayerPosition, number> = {
  QB: 0.22,
  RB: 0.34,
  WR: 0.38,
  TE: 0.4,
  K: 0.45,
  'D/ST': 0.5,
}

const round = (value: number) => Math.round(value * 10) / 10

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

function matchupOutlook(
  projectedPoints: number,
  localProjection: number,
  hasWeeklyProjection: boolean,
  opponent: string | undefined,
): { matchupOutlook: MatchupOutlook; matchupDelta: number } {
  if (!hasWeeklyProjection || !opponent) return { matchupOutlook: 'unknown', matchupDelta: 0 }
  const delta = round(projectedPoints - localProjection)
  if (delta >= 1.5) return { matchupOutlook: 'favorable', matchupDelta: delta }
  if (delta <= -1.5) return { matchupOutlook: 'tough', matchupDelta: delta }
  return { matchupOutlook: 'neutral', matchupDelta: delta }
}

function playerRisk(
  player: ImportedPlayer,
  projectionSource: LineupPlayer['projectionSource'],
  intelligence: WeeklyPlayerIntelligence | undefined,
  unavailable: boolean,
) {
  const factors: string[] = []
  let score = Math.round(positionVolatility[player.position] * 70)

  if (intelligence?.availability === 'questionable') {
    score += 18
    factors.push('Questionable injury status')
  } else if (intelligence?.availability === 'doubtful') {
    score += 35
    factors.push('Doubtful injury status')
  } else if (intelligence?.availability === 'out' || intelligence?.gameStatus === 'bye') {
    score = 100
    factors.push(intelligence?.gameStatus === 'bye' ? 'Bye week' : 'Unavailable this week')
  } else if (!intelligence || intelligence.availability === 'unknown') {
    score += 7
    factors.push('Player status is not confirmed')
  }

  if (intelligence?.confidence === 'medium') {
    score += 8
    factors.push('Partial weekly data')
  } else if (intelligence?.confidence === 'low') {
    score += 15
    factors.push('Limited weekly data')
  }

  if (projectionSource === 'estimate') {
    score += 10
    factors.push('Projection uses a position estimate')
  } else if (projectionSource === 'ranking') {
    score += 5
    factors.push('Projection uses a season-ranking estimate')
  }

  if (intelligence?.gameStatus === 'unknown') {
    score += 8
    factors.push('Kickoff and opponent are unconfirmed')
  }

  const riskScore = unavailable ? 100 : Math.min(95, score)
  const riskLevel: RiskLevel = riskScore <= 32 ? 'low' : riskScore <= 54 ? 'medium' : 'high'
  return { riskScore, riskLevel, riskFactors: factors }
}

function projectionRange(projectedPoints: number, position: PlayerPosition, riskScore: number) {
  if (projectedPoints <= 0) return { floorPoints: 0, ceilingPoints: 0 }
  const volatility = positionVolatility[position]
  return {
    floorPoints: round(Math.max(0, projectedPoints * (1 - volatility * 0.55 - riskScore / 500))),
    ceilingPoints: round(projectedPoints * (1 + volatility * 0.65)),
  }
}

function decisionSummary(
  outlook: MatchupOutlook,
  riskLevel: RiskLevel,
  projectionSource: LineupPlayer['projectionSource'],
) {
  const source = projectionSource === 'espn-weekly' ? 'ESPN weekly projection' : 'local projection fallback'
  if (outlook === 'favorable') return `Favorable ESPN-adjusted outlook with ${riskLevel} risk.`
  if (outlook === 'tough') return `Tough ESPN-adjusted outlook with ${riskLevel} risk.`
  if (outlook === 'neutral') return `Neutral ESPN-adjusted outlook with ${riskLevel} risk.`
  return `${source} with ${riskLevel} risk.`
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
    const projectedPoints = unavailable ? 0 : hasWeeklyProjection ? intelligence.projectedPoints as number : estimate.projectedPoints
    const projectionSource = hasWeeklyProjection ? 'espn-weekly' as const : estimate.projectionSource
    const outlook = matchupOutlook(projectedPoints, estimate.projectedPoints, hasWeeklyProjection, intelligence?.opponent)
    const risk = playerRisk(player, projectionSource, intelligence, unavailable)
    const range = projectionRange(projectedPoints, player.position, risk.riskScore)
    const decisionScore = round(projectedPoints - Math.min(1.5, risk.riskScore * 0.035))
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
      projectedPoints,
      projectionSource,
      unavailable,
      localProjection: estimate.projectedPoints,
      ...outlook,
      ...risk,
      ...range,
      decisionScore,
      decisionSummary: decisionSummary(outlook.matchupOutlook, risk.riskLevel, projectionSource),
    }
  })
}

function supportsSlot(player: LineupPlayer, slot: LineupSlot) {
  return slot === 'FLEX'
    ? player.position === 'RB' || player.position === 'WR' || player.position === 'TE'
    : player.position === slot
}

function compareStarts(first: LineupPlayer, second: LineupPlayer) {
  return second.decisionScore - first.decisionScore
    || second.floorPoints - first.floorPoints
    || second.projectedPoints - first.projectedPoints
    || first.name.localeCompare(second.name)
}

function assignBest(players: LineupPlayer[], slots: readonly LineupSlot[]): LineupAssignment[] {
  const remaining = [...players]
  const assignments: LineupAssignment[] = []

  slots.forEach((slot) => {
    const player = remaining
      .filter((candidate) => supportsSlot(candidate, slot))
      .sort(compareStarts)[0] ?? null

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

function assignmentTotal(assignments: LineupAssignment[], select: (player: LineupPlayer) => number) {
  return round(assignments.reduce((total, assignment) => total + (assignment.player ? select(assignment.player) : 0), 0))
}

function assignmentRisk(assignments: LineupAssignment[]) {
  const players = assignments.flatMap((assignment) => assignment.player ? [assignment.player] : [])
  if (!players.length) return 0
  return Math.round(players.reduce((total, player) => total + player.riskScore, 0) / players.length)
}

function bestLineup(players: LineupPlayer[]) {
  const fixedSlots = lineupSlots.filter((slot) => slot !== 'FLEX')
  const fixedAssignments = assignBest(players, fixedSlots)
  const usedIds = new Set(fixedAssignments.flatMap((assignment) => assignment.player ? [assignment.player.id] : []))
  const flex = players
    .filter((player) => supportsSlot(player, 'FLEX') && !usedIds.has(player.id))
    .sort(compareStarts)[0] ?? null

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

    const gain = round(assignment.projectedPoints - (previous?.projectedPoints ?? 0))
    const decisionGain = round(player.decisionScore - (previous?.player?.decisionScore ?? 0))
    const floorGain = round(player.floorPoints - (previous?.player?.floorPoints ?? 0))
    const riskImprovement = (previous?.player?.riskScore ?? 100) - player.riskScore
    if (decisionGain <= 0) return []

    const reason = !previous?.player
      ? 'Fills an open lineup slot'
      : previous.player.unavailable
        ? 'Replaces an unavailable starter'
        : gain > 0
          ? 'Stronger risk-adjusted weekly outlook'
          : 'Safer start in a close projection'
    const reasons = [
      `${player.decisionSummary} Modeled range: ${player.floorPoints.toFixed(1)}–${player.ceilingPoints.toFixed(1)} points.`,
    ]
    if (player.matchupOutlook !== 'unknown' && player.opponent) {
      reasons.push(`${player.matchupOutlook[0].toUpperCase()}${player.matchupOutlook.slice(1)} outlook ${player.homeAway === 'away' ? 'at' : 'vs'} ${player.opponent}; ESPN is ${Math.abs(player.matchupDelta).toFixed(1)} points ${player.matchupDelta >= 0 ? 'above' : 'below'} the neutral baseline.`)
    }
    if (floorGain > 0) reasons.push(`Raises the modeled floor by ${floorGain.toFixed(1)} points.`)
    if (riskImprovement > 0) reasons.push(`Lowers the lineup risk score by ${riskImprovement} points at this slot.`)

    return [{
      id: `${assignment.slot}-${player.id}`,
      position: player.position,
      slot: assignment.slot,
      starter: previous?.player ?? null,
      bench: player,
      gain,
      decisionGain,
      floorGain,
      riskImprovement,
      reason,
      reasons,
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

  const currentPoints = assignmentTotal(current, (player) => player.projectedPoints)
  const optimizedPoints = assignmentTotal(optimized, (player) => player.projectedPoints)
  return {
    current,
    optimized,
    swaps,
    currentPoints,
    optimizedPoints,
    projectedGain: round(optimizedPoints - currentPoints),
    currentFloor: assignmentTotal(current, (player) => player.floorPoints),
    optimizedFloor: assignmentTotal(optimized, (player) => player.floorPoints),
    currentCeiling: assignmentTotal(current, (player) => player.ceilingPoints),
    optimizedCeiling: assignmentTotal(optimized, (player) => player.ceilingPoints),
    currentRisk: assignmentRisk(current),
    optimizedRisk: assignmentRisk(optimized),
    warnings,
    rosterSource,
  }
}
