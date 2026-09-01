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
  {
    id: 'njigba-aiyuk',
    position: 'WR',
    start: 'Jaxon Smith-Njigba',
    startMeta: 'SEA vs DEN',
    sit: 'Brandon Aiyuk',
    sitMeta: 'SF at NO',
    gain: 2.8,
  },
  {
    id: 'goedert-hockenson',
    position: 'TE',
    start: 'Dallas Goedert',
    startMeta: 'PHI at WAS',
    sit: 'T.J. Hockenson',
    sitMeta: 'MIN at DET',
    gain: 2.1,
  },
  {
    id: 'buffalo-chiefs',
    position: 'DEF',
    start: 'Buffalo Bills',
    startMeta: 'vs ARI',
    sit: 'Kansas City Chiefs',
    sitMeta: 'vs LV',
    gain: 1.5,
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
  {
    id: 'allgeier',
    rank: 6,
    position: 'RB',
    player: 'Tyler Allgeier',
    matchup: 'ATL vs TB',
    available: 38,
    gain: 3.2,
    reason: 'Explosive runner in a high-volume role; upside play in PPR.',
  },
  {
    id: 'pierce',
    rank: 7,
    position: 'WR',
    player: 'Alec Pierce',
    matchup: 'IND at HOU',
    available: 31,
    gain: 2.9,
    reason: 'Consistent targets with WR1 potential if injuries persist.',
  },
  {
    id: 'schultz',
    rank: 8,
    position: 'TE',
    player: 'Dalton Schultz',
    matchup: 'HOU vs IND',
    available: 28,
    gain: 2.4,
    reason: 'Mid-range TE with steady end-zone involvement.',
  },
  {
    id: 'robinson',
    rank: 9,
    position: 'WR',
    player: 'Marvin Harrison Jr.',
    matchup: 'ARI at BUF',
    available: 22,
    gain: 2.1,
    reason: 'Rookie with elite talent; low availability makes him valuable.',
  },
  {
    id: 'pacheco',
    rank: 10,
    position: 'RB',
    player: 'Isiah Pacheco',
    matchup: 'KC vs LV',
    available: 18,
    gain: 1.8,
    reason: 'Late-season upside play; monitor injury status closely.',
  },
  {
    id: 'london',
    rank: 11,
    position: 'WR',
    player: 'Drake London',
    matchup: 'ATL vs TB',
    available: 15,
    gain: 1.5,
    reason: 'Target share is solid; matchup-dependent flex consideration.',
  },
]
