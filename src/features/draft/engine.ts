import { draftPlayers } from './players'
import type { DraftPick, DraftPlayer, DraftPosition, DraftSettings, Recommendation } from './types'

const FLEX_ELIGIBLE = new Set<DraftPlayer['position']>(['RB', 'WR', 'TE'])

export function totalRounds(settings: DraftSettings) {
  return Object.values(settings.rosterSlots).reduce((total, count) => total + count, 0)
}

export function totalPicks(settings: DraftSettings) {
  return settings.teamCount * totalRounds(settings)
}

export function nextPickNumber(picks: DraftPick[]) {
  return picks.length + 1
}

export function teamPickNumbers(settings: DraftSettings) {
  const rounds = totalRounds(settings)
  return Array.from({ length: rounds }, (_, index) => {
    const round = index + 1
    return round % 2 === 1
      ? (round - 1) * settings.teamCount + settings.draftPosition
      : round * settings.teamCount - settings.draftPosition + 1
  })
}

export function isMyTurn(settings: DraftSettings, picks: DraftPick[]) {
  return teamPickNumbers(settings).includes(nextPickNumber(picks))
}

export function myPlayers(picks: DraftPick[], playerPool: DraftPlayer[] = draftPlayers) {
  const mine = new Set(picks.filter((pick) => pick.draftedBy === 'mine').map((pick) => pick.playerId))
  return playerPool.filter((player) => mine.has(player.id))
}

export function availablePlayers(picks: DraftPick[], playerPool: DraftPlayer[] = draftPlayers) {
  const drafted = new Set(picks.map((pick) => pick.playerId))
  return playerPool.filter((player) => !drafted.has(player.id))
}

export function rosterCounts(players: DraftPlayer[]) {
  return players.reduce<Record<DraftPlayer['position'], number>>((counts, player) => {
    counts[player.position] += 1
    return counts
  }, { QB: 0, RB: 0, WR: 0, TE: 0, 'D/ST': 0, K: 0 })
}

export function positionNeed(position: DraftPlayer['position'], settings: DraftSettings, roster: DraftPlayer[]) {
  const counts = rosterCounts(roster)
  const directNeed = settings.rosterSlots[position] ?? 0
  const flexNeed = FLEX_ELIGIBLE.has(position) ? settings.rosterSlots.FLEX : 0
  return Math.max(0, directNeed + flexNeed - counts[position])
}

export function recommendations(settings: DraftSettings, picks: DraftPick[], playerPool: DraftPlayer[] = draftPlayers): Recommendation[] {
  const roster = myPlayers(picks, playerPool)
  const currentPick = nextPickNumber(picks)
  const rounds = totalRounds(settings)
  const currentRound = Math.ceil(currentPick / settings.teamCount)

  return availablePlayers(picks, playerPool)
    .map((player) => {
      const need = positionNeed(player.position, settings, roster)
      const scarcity = player.position === 'TE' ? 6 : player.position === 'RB' ? 5 : player.position === 'WR' ? 3 : 0
      const lateOnlyPenalty = (player.position === 'K' || player.position === 'D/ST') && currentRound < rounds - 2 ? 65 : 0
      const qbPenalty = player.position === 'QB' && roster.some((item) => item.position === 'QB') ? 28 : 0
      const value = Math.max(-25, player.adp - currentPick) * 1.15
      const needBoost = Math.min(28, need * 9)
      const scoringBoost = settings.scoring === 'PPR' && player.position === 'WR' ? 5 : settings.scoring === 'Standard' && player.position === 'RB' ? 5 : 0
      const score = 180 - player.adp + value + needBoost + scarcity + scoringBoost - lateOnlyPenalty - qbPenalty
      const reasons = [
        need > 0 ? `Fills one of your remaining ${player.position} needs.` : `Adds useful ${player.position} depth.`,
        value > 4 ? `Strong value at pick ${currentPick} versus ADP ${player.adp.toFixed(1)}.` : player.notes,
      ]
      if (scoringBoost > 0) reasons.push(`Profile fits your ${settings.scoring} scoring format.`)
      return { player, score, reasons }
    })
    .sort((a, b) => b.score - a.score || a.player.adp - b.player.adp)
}

export function slotAssignments(settings: DraftSettings, roster: DraftPlayer[]) {
  const remaining = [...roster]
  const assignments: { slot: DraftPosition; player?: DraftPlayer }[] = []
  const addDirect = (slot: DraftPosition, eligible?: Set<DraftPlayer['position']>) => {
    for (let index = 0; index < settings.rosterSlots[slot]; index += 1) {
      const playerIndex = remaining.findIndex((player) => eligible ? eligible.has(player.position) : player.position === slot)
      const [player] = playerIndex >= 0 ? remaining.splice(playerIndex, 1) : []
      assignments.push({ slot, player })
    }
  }
  ;(['QB', 'RB', 'WR', 'TE'] as DraftPosition[]).forEach((slot) => addDirect(slot))
  addDirect('FLEX', FLEX_ELIGIBLE)
  ;(['D/ST', 'K'] as DraftPosition[]).forEach((slot) => addDirect(slot))
  for (let index = 0; index < settings.rosterSlots.BENCH; index += 1) assignments.push({ slot: 'BENCH', player: remaining.shift() })
  return assignments
}
