const MAX_EARLY_REACH_PENALTY = -25
const ADP_VALUE_WEIGHT = 1.15

export function adpDraftValue(adp: number, currentPick: number) {
  return Math.max(MAX_EARLY_REACH_PENALTY, currentPick - adp) * ADP_VALUE_WEIGHT
}

export function baseAdpRecommendationScore(adp: number, currentPick: number) {
  return 180 - adp + adpDraftValue(adp, currentPick)
}
