import assert from 'node:assert/strict'
import test from 'node:test'
import { adpDraftValue, baseAdpRecommendationScore } from '../src/features/draft/recommendationScore.ts'

test('pick one favors elite rankings instead of the bottom of the board', () => {
  const rankedPlayers = [1, 2, 50, 295]
    .map((adp) => ({ adp, score: baseAdpRecommendationScore(adp, 1) }))
    .sort((first, second) => second.score - first.score)

  assert.deepEqual(rankedPlayers.map((player) => player.adp), [1, 2, 50, 295])
  assert.ok(rankedPlayers[0].score > rankedPlayers.at(-1).score)
})

test('a player who falls past ADP receives positive draft value', () => {
  assert.ok(adpDraftValue(50, 100) > 0)
  assert.equal(adpDraftValue(100, 100), 0)
  assert.ok(adpDraftValue(110, 100) < 0)
})

test('reaching far ahead of ADP is penalized and capped', () => {
  assert.ok(Math.abs(adpDraftValue(295, 1) - -28.75) < Number.EPSILON * 32)
  assert.ok(Math.abs(adpDraftValue(500, 1) - -28.75) < Number.EPSILON * 32)
})
