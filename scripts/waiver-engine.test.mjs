import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWaiverBoard, filterWaiverBoard } from '../src/features/waivers/waiverEngine.ts'

const rosterPlayer = (name, position, slot = 'Bench') => ({
  id: `roster-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`,
  name,
  position,
  nflTeam: 'FA',
  slot,
})

const candidate = (name, position, projectedPoints, index = 1) => ({
  id: `candidate-${index}`,
  name,
  position,
  nflTeam: 'FA',
  bye: 10,
  projectedPoints,
  adp: index,
  tier: 1,
  notes: 'Test candidate',
})

const fullRoster = [
  rosterPlayer('Only Quarterback', 'QB', 'Starter'),
  rosterPlayer('Running Back One', 'RB', 'Starter'),
  rosterPlayer('Running Back Two', 'RB', 'Starter'),
  rosterPlayer('Receiver One', 'WR', 'Starter'),
  rosterPlayer('Receiver Two', 'WR', 'Starter'),
  rosterPlayer('Only Tight End', 'TE', 'Starter'),
  rosterPlayer('Only Kicker', 'K', 'Starter'),
  rosterPlayer('Only Defense', 'D/ST', 'Starter'),
  rosterPlayer('Bench Runner One', 'RB'),
  rosterPlayer('Bench Runner Two', 'RB'),
  rosterPlayer('Bench Receiver One', 'WR'),
  rosterPlayer('Bench Receiver Two', 'WR'),
  rosterPlayer('Bench Receiver Three', 'WR'),
  rosterPlayer('Bench Receiver Four', 'WR'),
  rosterPlayer('Bench Receiver Five', 'WR'),
]

test('waiver board excludes players already on the roster using normalized names', () => {
  const board = buildWaiverBoard(
    [rosterPlayer("Ja'Marr Chase", 'WR', 'Starter')],
    [candidate('JAMARR CHASE', 'WR', 300), candidate('Available Receiver', 'WR', 220, 2)],
  )

  assert.deepEqual(board.map((recommendation) => recommendation.candidate.name), ['Available Receiver'])
})

test('a full roster never suggests dropping the only required-position player', () => {
  const [recommendation] = buildWaiverBoard(fullRoster, [candidate('Elite Quarterback', 'QB', 380)])

  assert.ok(recommendation.drop)
  assert.notEqual(recommendation.drop?.name, 'Only Quarterback')
  assert.equal(recommendation.safeDrop, true)
})

test('an incomplete roster recommends adding without inventing a drop', () => {
  const [recommendation] = buildWaiverBoard(
    [rosterPlayer('Roster Receiver', 'WR', 'Starter')],
    [candidate('Available Runner', 'RB', 225)],
  )

  assert.equal(recommendation.drop, null)
  assert.equal(recommendation.safeDrop, true)
  assert.ok(recommendation.reasons.some((reason) => reason.includes('open spot')))
})

test('higher-value candidates rank first and every result is explicitly unverified', () => {
  const board = buildWaiverBoard(fullRoster, [
    candidate('Depth Receiver', 'WR', 120, 2),
    candidate('Impact Receiver', 'WR', 285, 1),
  ])

  assert.equal(board[0]?.candidate.name, 'Impact Receiver')
  assert.equal(board[0]?.rank, 1)
  assert.ok(board[0]?.projectedGain > board[1]?.projectedGain)
  assert.ok(board.every((recommendation) => recommendation.availability === 'unverified'))
  assert.ok(board.every((recommendation) => recommendation.reasons.some((reason) => reason.includes('confirm'))))
})

test('position, search, and upgrade filters compose deterministically', () => {
  const board = buildWaiverBoard(fullRoster, [
    candidate('Alpha Receiver', 'WR', 300, 1),
    candidate('Alpha Runner', 'RB', 280, 2),
    candidate('Low Receiver', 'WR', 10, 3),
  ])
  const filtered = filterWaiverBoard(board, { search: 'alpha', position: 'WR', upgradesOnly: true })

  assert.deepEqual(filtered.map((recommendation) => recommendation.candidate.name), ['Alpha Receiver'])
})

test('rank-only imports receive a positive deterministic projection fallback', () => {
  const rankOnly = [
    candidate('Ranked Receiver One', 'WR', 0, 1),
    candidate('Ranked Receiver Two', 'WR', 0, 2),
  ]
  const board = buildWaiverBoard([], rankOnly)

  assert.ok(board.every((recommendation) => recommendation.candidate.projectedPoints > 0))
  assert.equal(board[0]?.candidate.name, 'Ranked Receiver One')
  assert.ok(board[0]?.candidate.projectedPoints > board[1]?.candidate.projectedPoints)
})
