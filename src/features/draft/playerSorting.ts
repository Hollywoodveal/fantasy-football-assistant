import type { DraftPlayer } from './types'

export const playerSortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'adp', label: 'Ranking / ADP · low first' },
  { value: 'projected', label: 'Projected points · high first' },
  { value: 'tier', label: 'Tier · low first' },
  { value: 'name', label: 'Player name · A–Z' },
  { value: 'team', label: 'Team · A–Z' },
  { value: 'bye', label: 'Bye week · earliest' },
] as const

export type PlayerSort = (typeof playerSortOptions)[number]['value']

const playerTextCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function comparePlayerText(first: string, second: string) {
  return playerTextCollator.compare(first, second)
}

function compareKnownPositiveNumbers(first: number, second: number) {
  const normalizedFirst = Number.isFinite(first) && first > 0 ? first : Number.POSITIVE_INFINITY
  const normalizedSecond = Number.isFinite(second) && second > 0 ? second : Number.POSITIVE_INFINITY
  return normalizedFirst - normalizedSecond
}

export function sortDraftPlayers(players: DraftPlayer[], sort: PlayerSort, recommendationScores: ReadonlyMap<string, number>) {
  const recommendedOrder = (first: DraftPlayer, second: DraftPlayer) =>
    (recommendationScores.get(second.id) ?? 0) - (recommendationScores.get(first.id) ?? 0) ||
    compareKnownPositiveNumbers(first.adp, second.adp) ||
    comparePlayerText(first.name, second.name)
  const comparePlayers = (first: DraftPlayer, second: DraftPlayer) => {
    switch (sort) {
      case 'adp':
        return compareKnownPositiveNumbers(first.adp, second.adp) || recommendedOrder(first, second)
      case 'projected':
        return second.projectedPoints - first.projectedPoints || recommendedOrder(first, second)
      case 'tier':
        return compareKnownPositiveNumbers(first.tier, second.tier) || compareKnownPositiveNumbers(first.adp, second.adp) || comparePlayerText(first.name, second.name)
      case 'name':
        return comparePlayerText(first.name, second.name) || recommendedOrder(first, second)
      case 'team':
        return comparePlayerText(first.nflTeam, second.nflTeam) || comparePlayerText(first.name, second.name)
      case 'bye':
        return compareKnownPositiveNumbers(first.bye, second.bye) || comparePlayerText(first.name, second.name)
      default:
        return recommendedOrder(first, second)
    }
  }

  return [...players].sort(comparePlayers)
}
