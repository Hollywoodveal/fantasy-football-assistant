export type LineupMove = {
  id: string
  position: string
  start: string
  startMeta: string
  sit: string
  sitMeta: string
  gain: number
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
