import assert from 'node:assert/strict'
import test from 'node:test'
import { recommendations } from '../src/features/draft/engine.ts'

const settings = {
  schemaVersion: 1,
  leagueName: 'Test League',
  teamName: 'Test Team',
  teamCount: 12,
  scoring: 'PPR',
  draftPosition: 1,
  rosterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, 'D/ST': 1, K: 1, BENCH: 6 },
}

const player = (overrides) => ({
  id: overrides.name.toLowerCase().replaceAll(' ', '-'),
  name: overrides.name,
  position: 'WR',
  nflTeam: 'FA',
  bye: 1,
  projectedPoints: 0,
  adp: 1,
  tier: 1,
  notes: 'Test player.',
  ...overrides,
})

test('full recommendation engine keeps elite ADP ahead of a deep player at pick one', () => {
  const pool = [
    player({ name: 'Elite Player', adp: 1 }),
    player({ name: 'Deep Player', adp: 295, tier: 25 }),
  ]
  assert.equal(recommendations(settings, [], pool)[0].player.name, 'Elite Player')
})

test('questionable status lowers a tied player below a healthy alternative', () => {
  const pool = [
    player({ name: 'Questionable Player', injuryStatus: 'Questionable' }),
    player({ name: 'Healthy Player' }),
  ]
  const ranked = recommendations(settings, [], pool)
  assert.equal(ranked[0].player.name, 'Healthy Player')
  assert.equal(ranked[1].breakdown.injury, -8)
})

test('recommendations expose three choices and next-pick guidance', () => {
  const pool = [
    player({ name: 'Player One', adp: 1 }),
    player({ name: 'Player Two', adp: 2 }),
    player({ name: 'Player Three', adp: 3 }),
    player({ name: 'Player Four', adp: 40 }),
  ]
  const ranked = recommendations(settings, [], pool)
  assert.deepEqual(ranked.slice(0, 3).map((item) => item.player.name), ['Player One', 'Player Two', 'Player Three'])
  assert.equal(ranked[0].availability.status, 'take-now')
  assert.equal(ranked[0].availability.nextPick, 24)
})

test('a recent position run appears in the score breakdown and explanation', () => {
  const pool = [
    player({ name: 'RB One', position: 'RB', adp: 1 }),
    player({ name: 'RB Two', position: 'RB', adp: 2 }),
    player({ name: 'RB Three', position: 'RB', adp: 3 }),
    player({ name: 'Available RB', position: 'RB', adp: 4 }),
    player({ name: 'Available WR', position: 'WR', adp: 5 }),
  ]
  const picks = pool.slice(0, 3).map((item, index) => ({
    playerId: item.id,
    pickNumber: index + 1,
    draftedBy: 'other',
    draftedAt: new Date(index).toISOString(),
  }))
  const rb = recommendations(settings, picks, pool).find((item) => item.player.name === 'Available RB')
  assert.equal(rb?.breakdown.positionRun, 5)
  assert.ok(rb?.reasons.some((reason) => reason.includes('RB run')))
})
