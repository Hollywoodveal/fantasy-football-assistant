import type { DraftPlayer } from '../draft/types.ts'
import type { ImportedPlayer, PlayerPosition, ScoringFormat } from '../league/types.ts'
import { enrichRoster, type LineupPlayer } from '../lineup/lineupEngine.ts'
import type { EspnRosteredPlayer, WaiverClaimRules } from './waiverAvailability.ts'

export const waiverPositions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'D/ST'] as const
export type WaiverPositionFilter = (typeof waiverPositions)[number]
export type WaiverPriority = 'priority' | 'upgrade' | 'watch'

export type WaiverRecommendation = {
  rank: number
  sourceRank: number
  candidate: LineupPlayer
  drop: LineupPlayer | null
  comparison: LineupPlayer | null
  projectedGain: number
  floorGain: number
  ceilingGain: number
  riskImprovement: number
  score: number
  priority: WaiverPriority
  safeDrop: boolean
  availability: 'unverified' | 'verified-unrostered'
  reasons: string[]
}

type WaiverBoardOptions = {
  scoring?: ScoringFormat
  rosterCapacity?: number
  availability?: {
    refreshedAt: string
    teamCount: number
    rosteredPlayers: Pick<EspnRosteredPlayer, 'name' | 'position' | 'nflTeam'>[]
  }
}

export type WaiverClaimPlanItem = {
  order: number
  recommendation: WaiverRecommendation
  role: 'primary' | 'backup'
  backupFor: number | null
  suggestedBid: number | null
  bidPercent: number | null
  strategyLabel: string
}

const minimumPositionCounts: Record<PlayerPosition, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  K: 1,
  'D/ST': 1,
}

const round = (value: number) => Math.round(value * 10) / 10

const rankingWeeklyCeiling: Record<PlayerPosition, number> = {
  QB: 21,
  RB: 17.5,
  WR: 17,
  TE: 13.5,
  K: 9.5,
  'D/ST': 9,
}

const rankingWeeklyFloor: Record<PlayerPosition, number> = {
  QB: 13,
  RB: 6,
  WR: 6,
  TE: 5,
  K: 6,
  'D/ST': 5,
}

export const normalizePlayerName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

function asRosterPlayer(player: DraftPlayer): ImportedPlayer {
  return {
    id: `waiver-${player.id}`,
    name: player.name,
    position: player.position,
    nflTeam: player.nflTeam,
    slot: 'Bench',
  }
}

function rankingProjectionFallback(player: DraftPlayer, overallRank: number) {
  if (player.projectedPoints > 0) return player
  const weekly = Math.max(
    rankingWeeklyFloor[player.position],
    rankingWeeklyCeiling[player.position] - Math.log2(overallRank + 1) * 1.25,
  )
  return { ...player, projectedPoints: round(weekly * 17) }
}

function rosterCounts(roster: LineupPlayer[]) {
  return roster.reduce<Partial<Record<PlayerPosition, number>>>((counts, player) => {
    if (player.slot !== 'IR') counts[player.position] = (counts[player.position] ?? 0) + 1
    return counts
  }, {})
}

function safeDropFor(candidate: LineupPlayer, roster: LineupPlayer[]) {
  const counts = rosterCounts(roster)
  return roster
    .filter((player) => player.slot !== 'IR' && (counts[player.position] ?? 0) > minimumPositionCounts[player.position])
    .sort((first, second) => {
      const firstBench = first.slot === 'Bench' ? 0 : 1
      const secondBench = second.slot === 'Bench' ? 0 : 1
      return firstBench - secondBench
        || Number(first.position !== candidate.position) - Number(second.position !== candidate.position)
        || first.decisionScore - second.decisionScore
        || first.name.localeCompare(second.name)
    })[0] ?? null
}

function recommendationReasons(
  candidate: LineupPlayer,
  drop: LineupPlayer | null,
  comparison: LineupPlayer | null,
  projectedGain: number,
  floorGain: number,
  riskImprovement: number,
  hasOpenRosterSpot: boolean,
  availability: WaiverBoardOptions['availability'],
) {
  const reasons = [
    `${candidate.projectedPoints.toFixed(1)}-point local weekly estimate with a ${candidate.floorPoints.toFixed(1)}–${candidate.ceilingPoints.toFixed(1)} modeled range.`,
  ]

  if (hasOpenRosterSpot) {
    reasons.push('Your loaded roster has an open spot, so no drop is suggested.')
    if (comparison) reasons.push(`${projectedGain >= 0 ? 'Projects' : 'Rates'} ${Math.abs(projectedGain).toFixed(1)} points ${projectedGain >= 0 ? 'above' : 'below'} your lowest-rated ${candidate.position}, ${comparison.name}.`)
  } else if (drop) {
    reasons.push(`${projectedGain >= 0 ? 'Adds' : 'Trails by'} ${Math.abs(projectedGain).toFixed(1)} projected roster-value points versus ${drop.name}.`)
    if (floorGain > 0) reasons.push(`Raises the modeled floor by ${floorGain.toFixed(1)} points.`)
    if (riskImprovement > 0) reasons.push(`Lowers modeled risk by ${riskImprovement} points.`)
  } else {
    reasons.push('No safe drop was found without cutting below a required position minimum.')
  }

  if (availability) {
    const checkedAt = new Date(availability.refreshedAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    })
    reasons.push(`Verified unrostered across ${availability.teamCount} ESPN teams at ${checkedAt}. Recheck ESPN before submitting because league rosters can change.`)
  } else {
    reasons.push('Availability is unverified; confirm the player is a free agent in ESPN before acting.')
  }
  return reasons
}

function playerKey(player: Pick<ImportedPlayer, 'name' | 'position'> & { nflTeam?: string }) {
  if (player.position === 'D/ST' && player.nflTeam && player.nflTeam !== 'FA') return `dst:${player.nflTeam.toUpperCase()}`
  return `${normalizePlayerName(player.name)}:${player.position}`
}

export function buildWaiverBoard(
  roster: ImportedPlayer[],
  candidates: DraftPlayer[],
  options: WaiverBoardOptions = {},
): WaiverRecommendation[] {
  const scoring = options.scoring ?? 'PPR'
  const rosterCapacity = options.rosterCapacity ?? 15
  const activeRoster = enrichRoster(roster.filter((player) => player.slot !== 'IR'), scoring)
  const rosterNames = new Set(roster.map((player) => normalizePlayerName(player.name)))
  const leagueRosteredPlayers = new Set(options.availability?.rosteredPlayers.map(playerKey) ?? [])
  const hasOpenRosterSpot = roster.filter((player) => player.slot !== 'IR').length < rosterCapacity
  const projectedCandidates = candidates.map((player, index) => rankingProjectionFallback(player, index + 1))

  const enrichedCandidates = enrichRoster(
    projectedCandidates
      .filter((player) => !rosterNames.has(normalizePlayerName(player.name)))
      .filter((player) => !leagueRosteredPlayers.has(playerKey(player)))
      .map(asRosterPlayer),
    scoring,
    [],
    projectedCandidates,
  )
  const sourceRank = new Map(candidates.map((player, index) => [normalizePlayerName(player.name), index + 1]))

  return enrichedCandidates
    .map((candidate) => {
      const drop = hasOpenRosterSpot ? null : safeDropFor(candidate, activeRoster)
      const comparison = drop ?? (hasOpenRosterSpot
        ? activeRoster
            .filter((player) => player.position === candidate.position)
            .sort((first, second) => first.decisionScore - second.decisionScore || first.name.localeCompare(second.name))[0] ?? null
        : null)
      const comparisonPoints = comparison?.projectedPoints ?? 0
      const projectedGain = round(candidate.projectedPoints - comparisonPoints)
      const floorGain = round(candidate.floorPoints - (comparison?.floorPoints ?? 0))
      const ceilingGain = round(candidate.ceilingPoints - (comparison?.ceilingPoints ?? 0))
      const riskImprovement = (comparison?.riskScore ?? candidate.riskScore) - candidate.riskScore
      const positionCount = activeRoster.filter((player) => player.position === candidate.position).length
      const needBonus = positionCount < minimumPositionCounts[candidate.position]
        ? 18
        : positionCount === minimumPositionCounts[candidate.position] ? 6 : 0
      const surplusPenalty = Math.max(0, positionCount - minimumPositionCounts[candidate.position]) * 4
      const safeDrop = hasOpenRosterSpot || Boolean(drop)
      const score = round(
        candidate.decisionScore * 0.7
        + projectedGain * 5
        + Math.max(-5, floorGain) * 1.8
        + Math.max(0, riskImprovement) * 0.15
        + needBonus
        - surplusPenalty
        - (sourceRank.get(normalizePlayerName(candidate.name)) ?? candidates.length) * 0.05
        - (safeDrop ? 0 : 25),
      )
      const priority: WaiverPriority = safeDrop && projectedGain >= 3
        ? 'priority'
        : safeDrop && projectedGain > 0 ? 'upgrade' : 'watch'

      return {
        rank: 0,
        sourceRank: sourceRank.get(normalizePlayerName(candidate.name)) ?? candidates.length,
        candidate,
        drop,
        comparison,
        projectedGain,
        floorGain,
        ceilingGain,
        riskImprovement,
        score,
        priority,
        safeDrop,
        availability: options.availability ? 'verified-unrostered' as const : 'unverified' as const,
        reasons: recommendationReasons(candidate, drop, comparison, projectedGain, floorGain, riskImprovement, hasOpenRosterSpot, options.availability),
      }
    })
    .sort((first, second) => second.score - first.score
      || second.projectedGain - first.projectedGain
      || first.sourceRank - second.sourceRank
      || first.candidate.name.localeCompare(second.candidate.name))
    .map((recommendation, index) => ({ ...recommendation, rank: index + 1 }))
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function suggestedFaabPercent(recommendation: WaiverRecommendation) {
  const priorityBase = recommendation.priority === 'priority' ? 14 : recommendation.priority === 'upgrade' ? 7 : 2
  const gainBonus = clamp(Math.round(Math.max(0, recommendation.projectedGain) / 2), 0, 10)
  const riskAdjustment = recommendation.candidate.riskLevel === 'low'
    ? 2
    : recommendation.candidate.riskLevel === 'high' ? -2 : 0
  return clamp(priorityBase + gainBonus + riskAdjustment, 1, 35)
}

export function buildClaimStrategy(
  board: WaiverRecommendation[],
  shortlistIds: string[],
  claimRules: WaiverClaimRules = { mode: 'priority' },
): WaiverClaimPlanItem[] {
  const selectedIds = new Set(shortlistIds)
  const selected = board.filter((recommendation) => selectedIds.has(recommendation.candidate.id))
  const primaryBySwap = new Map<string, number>()

  return selected.map((recommendation, index) => {
    const order = index + 1
    const swapKey = recommendation.drop
      ? `drop:${recommendation.drop.id}`
      : 'open:roster-spot'
    const existingPrimary = primaryBySwap.get(swapKey)
    const role = existingPrimary === undefined ? 'primary' as const : 'backup' as const
    if (existingPrimary === undefined) primaryBySwap.set(swapKey, order)

    if (claimRules.mode === 'faab') {
      const bidPercent = suggestedFaabPercent(recommendation)
      const remaining = claimRules.budgetRemaining
      const suggestedBid = remaining === undefined
        ? null
        : remaining <= 0 ? 0 : Math.max(1, Math.round(remaining * bidPercent / 100))
      return {
        order,
        recommendation,
        role,
        backupFor: existingPrimary ?? null,
        suggestedBid,
        bidPercent,
        strategyLabel: suggestedBid === null
          ? `${bidPercent}% of remaining FAAB`
          : `$${suggestedBid} · ${bidPercent}% of $${remaining} remaining`,
      }
    }

    return {
      order,
      recommendation,
      role,
      backupFor: existingPrimary ?? null,
      suggestedBid: null,
      bidPercent: null,
      strategyLabel: claimRules.waiverRank
        ? `Waiver priority #${claimRules.waiverRank} · submit in this order`
        : 'Submit claims in this order',
    }
  })
}

export function filterWaiverBoard(
  recommendations: WaiverRecommendation[],
  options: { search?: string; position?: WaiverPositionFilter; upgradesOnly?: boolean } = {},
) {
  const search = options.search?.trim().toLowerCase() ?? ''
  const position = options.position ?? 'ALL'
  return recommendations.filter((recommendation) => {
    const player = recommendation.candidate
    const matchesSearch = !search || `${player.name} ${player.nflTeam}`.toLowerCase().includes(search)
    const matchesPosition = position === 'ALL' || player.position === position
    const matchesUpgrade = !options.upgradesOnly || recommendation.priority !== 'watch'
    return matchesSearch && matchesPosition && matchesUpgrade
  })
}
