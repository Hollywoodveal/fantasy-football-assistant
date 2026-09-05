import type { PlayerPosition } from './types'

export type AvailabilityOutlook = {
  status: 'take-now' | 'at-risk' | 'likely' | 'final-pick'
  label: string
  nextPick: number | null
}

export type PositionRun = {
  position: PlayerPosition
  count: number
  window: number
}

const SEVERE_INJURY_STATUSES = new Set(['IR', 'OUT', 'PUP', 'NFI', 'SUSPENDED', 'INACTIVE'])

function normalizedStatus(value?: string) {
  return value?.trim().toUpperCase() ?? ''
}

export function injuryAdjustment(injuryStatus?: string, availabilityStatus?: string) {
  const injury = normalizedStatus(injuryStatus)
  const availability = normalizedStatus(availabilityStatus)

  if (SEVERE_INJURY_STATUSES.has(injury) || SEVERE_INJURY_STATUSES.has(availability)) return -55
  if (injury === 'DOUBTFUL') return -24
  if (injury === 'QUESTIONABLE') return -8
  return 0
}

export function roundPlanAdjustment({
  position,
  currentRound,
  totalRounds,
  directNeed,
}: {
  position: PlayerPosition
  currentRound: number
  totalRounds: number
  directNeed: number
}) {
  const corePosition = position === 'RB' || position === 'WR'
  const latePosition = position === 'K' || position === 'D/ST'
  const starterDeadline = Math.max(5, Math.ceil(totalRounds * 0.6))

  if (latePosition) return currentRound >= totalRounds - 2 && directNeed > 0 ? 12 : 0
  if (currentRound <= 3 && corePosition && directNeed > 0) return 5
  if (currentRound >= starterDeadline && directNeed > 0) {
    return Math.min(22, 8 + (currentRound - starterDeadline) * 3)
  }
  if (currentRound < starterDeadline && directNeed === 0) return -4
  return 0
}

export function availabilityOutlook(adp: number, currentPick: number, nextPick: number | null): AvailabilityOutlook {
  if (nextPick === null) return { status: 'final-pick', label: 'Your final scheduled pick', nextPick }

  const picksUntilNextTurn = Math.max(1, nextPick - currentPick)
  const riskBuffer = Math.max(2, Math.round(picksUntilNextTurn * 0.2))

  if (adp <= currentPick || adp < nextPick - riskBuffer) {
    return { status: 'take-now', label: `Unlikely to reach pick ${nextPick}`, nextPick }
  }
  if (adp <= nextPick + riskBuffer) {
    return { status: 'at-risk', label: `May not reach pick ${nextPick}`, nextPick }
  }
  return { status: 'likely', label: `Could reach pick ${nextPick}`, nextPick }
}

export function detectPositionRun(positions: PlayerPosition[], window = 6): PositionRun | null {
  const recent = positions.slice(-window)
  if (recent.length < 3) return null

  const counts = new Map<PlayerPosition, number>()
  for (const position of recent) counts.set(position, (counts.get(position) ?? 0) + 1)

  let leader: PositionRun | null = null
  for (const [position, count] of counts) {
    if (count < 3) continue
    if (!leader || count > leader.count) leader = { position, count, window: recent.length }
  }
  return leader
}
