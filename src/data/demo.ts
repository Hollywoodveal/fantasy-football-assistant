export type LineupMove = {
  id: string
  position: string
  start: string
  startMeta: string
  sit: string
  sitMeta: string
  gain: number
}

export type WaiverTarget = {
  id: string
  rank: number
  position: string
  player: string
  matchup: string
  available: number
  gain: number
  reason: string
}

export const lineupMoves: LineupMove[] = [
  {
    id: 'love-smith',
    position: 'QB',
    start: 'Jordan Love',
    startMeta: 'GB vs CHI',
    sit: 'Geno Smith',
    sitMeta: 'LV vs NE',
    gain: 4.6,
  },
  {
    id: 'white-spears',
    position: 'RB',
    start: 'Zamir White',
    startMeta: 'LV vs LAC',
    sit: 'Tyjae Spears',
    sitMeta: 'TEN at DEN',
    gain: 3.9,
  },
  {
    id: 'dell-watson',
    position: 'WR',
    start: 'Tank Dell',
    startMeta: 'HOU vs IND',
    sit: 'Christian Watson',
    sitMeta: 'GB vs CHI',
    gain: 3.9,
  },
]

export const waiverTargets: WaiverTarget[] = [
  {
    id: 'brown',
    rank: 1,
    position: 'RB',
    player: 'Chase Brown',
    matchup: 'CIN vs NE',
    available: 78,
    gain: 8.7,
    reason: 'Best combination of immediate touches and rest-of-season upside.',
  },
  {
    id: 'smith-njigba',
    rank: 2,
    position: 'WR',
    player: 'Jaxon Smith-Njigba',
    matchup: 'SEA vs DEN',
    available: 65,
    gain: 6.3,
    reason: 'Strong route volume makes him a high-floor flex upgrade.',
  },
  {
    id: 'smith',
    rank: 3,
    position: 'TE',
    player: 'Jonnu Smith',
    matchup: 'MIA vs JAX',
    available: 54,
    gain: 5.1,
    reason: 'A favorable matchup and red-zone role raise his weekly ceiling.',
  },
  {
    id: 'downs',
    rank: 4,
    position: 'WR',
    player: 'Josh Downs',
    matchup: 'IND at HOU',
    available: 47,
    gain: 4.4,
    reason: 'A useful PPR stash with a path to steady target volume.',
  },
  {
    id: 'davis',
    rank: 5,
    position: 'RB',
    player: 'Ray Davis',
    matchup: 'BUF vs ARI',
    available: 42,
    gain: 3.8,
    reason: 'Priority bench stash with standalone touches and injury upside.',
  },
]
