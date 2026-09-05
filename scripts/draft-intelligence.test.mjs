import assert from 'node:assert/strict'
import test from 'node:test'
import { availabilityOutlook, detectPositionRun, injuryAdjustment, roundPlanAdjustment } from '../src/features/draft/draftIntelligence.ts'

test('next-pick outlook tells managers when an elite player should be taken now', () => {
  assert.deepEqual(availabilityOutlook(1.4, 5, 16), {
    status: 'take-now',
    label: 'Unlikely to reach pick 16',
    nextPick: 16,
  })
  assert.equal(availabilityOutlook(16, 5, 16).status, 'at-risk')
  assert.equal(availabilityOutlook(40, 5, 16).status, 'likely')
})

test('injury adjustment penalizes uncertain and unavailable players', () => {
  assert.equal(injuryAdjustment(undefined, 'Active'), 0)
  assert.equal(injuryAdjustment('Questionable', 'Active'), -8)
  assert.equal(injuryAdjustment('Doubtful', 'Active'), -24)
  assert.equal(injuryAdjustment('Out', 'Inactive'), -55)
})

test('round plan prioritizes open starters without forcing early kickers', () => {
  assert.equal(roundPlanAdjustment({ position: 'RB', currentRound: 2, totalRounds: 15, directNeed: 1 }), 5)
  assert.ok(roundPlanAdjustment({ position: 'TE', currentRound: 11, totalRounds: 15, directNeed: 1 }) >= 8)
  assert.equal(roundPlanAdjustment({ position: 'TE', currentRound: 11, totalRounds: 15, directNeed: 0 }), 0)
  assert.equal(roundPlanAdjustment({ position: 'K', currentRound: 2, totalRounds: 15, directNeed: 1 }), 0)
  assert.equal(roundPlanAdjustment({ position: 'K', currentRound: 14, totalRounds: 15, directNeed: 1 }), 12)
})

test('position-run detection requires at least three recent selections', () => {
  assert.deepEqual(detectPositionRun(['WR', 'RB', 'RB', 'TE', 'RB', 'QB']), {
    position: 'RB',
    count: 3,
    window: 6,
  })
  assert.equal(detectPositionRun(['RB', 'WR', 'RB', 'TE', 'QB', 'WR']), null)
})
