import assert from 'node:assert/strict'
import test from 'node:test'
import { buildClaimStrategy, buildWaiverBoard, filterWaiverBoard } from '../src/features/waivers/waiverEngine.ts'

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

test('verified ESPN roster snapshots remove players held by every league team', () => {
  const board = buildWaiverBoard(
    [rosterPlayer('My Receiver', 'WR', 'Starter')],
    [candidate('Rostered Elsewhere', 'WR', 280), candidate('Actually Unrostered', 'WR', 250, 2)],
    {
      availability: {
        refreshedAt: '2026-09-06T12:00:00.000Z',
        teamCount: 12,
        rosteredPlayers: [{ name: 'Rostered Elsewhere', position: 'WR' }],
      },
    },
  )

  assert.deepEqual(board.map((recommendation) => recommendation.candidate.name), ['Actually Unrostered'])
  assert.equal(board[0]?.availability, 'verified-unrostered')
  assert.ok(board[0]?.reasons.some((reason) => reason.includes('12 ESPN teams')))
})

test('verified snapshots match defenses by NFL team even when labels differ', () => {
  const board = buildWaiverBoard(
    [],
    [{ ...candidate('Pittsburgh D/ST', 'D/ST', 130), nflTeam: 'PIT' }],
    {
      availability: {
        refreshedAt: '2026-09-06T12:00:00.000Z',
        teamCount: 12,
        rosteredPlayers: [{ name: 'Pittsburgh Steelers', position: 'D/ST', nflTeam: 'PIT' }],
      },
    },
  )

  assert.equal(board.length, 0)
})

test('claim strategy keeps board order and labels repeated drops as backups', () => {
  const board = buildWaiverBoard(fullRoster, [
    candidate('Primary Receiver', 'WR', 310, 1),
    candidate('Backup Receiver', 'WR', 290, 2),
    candidate('Third Receiver', 'WR', 270, 3),
  ])
  const shortlist = board.map((recommendation) => recommendation.candidate.id)
  const plan = buildClaimStrategy(board, shortlist, { mode: 'priority', waiverRank: 4 })

  assert.deepEqual(plan.map((item) => item.recommendation.candidate.name), board.map((item) => item.candidate.name))
  assert.equal(plan[0]?.role, 'primary')
  assert.equal(plan[1]?.role, 'backup')
  assert.equal(plan[1]?.backupFor, 1)
  assert.match(plan[0]?.strategyLabel ?? '', /priority #4/)
})

test('FAAB strategy produces deterministic, bounded bids from remaining budget', () => {
  const board = buildWaiverBoard(fullRoster, [candidate('Impact Runner', 'RB', 320, 1)])
  const first = buildClaimStrategy(board, [board[0].candidate.id], { mode: 'faab', budgetRemaining: 73 })
  const second = buildClaimStrategy(board, [board[0].candidate.id], { mode: 'faab', budgetRemaining: 73 })

  assert.deepEqual(first, second)
  assert.ok((first[0]?.bidPercent ?? 0) >= 1)
  assert.ok((first[0]?.bidPercent ?? 100) <= 35)
  assert.ok((first[0]?.suggestedBid ?? 0) >= 1)
  assert.ok((first[0]?.suggestedBid ?? 100) <= 73)
})

test('priority strategy never invents a FAAB bid', () => {
  const board = buildWaiverBoard([], [
    candidate('Open Spot Runner', 'RB', 230, 1),
    candidate('Open Spot Receiver', 'WR', 220, 2),
  ])
  const plan = buildClaimStrategy(board, board.map((item) => item.candidate.id), { mode: 'priority' })

  assert.equal(plan[0].suggestedBid, null)
  assert.equal(plan[0].bidPercent, null)
  assert.match(plan[0].strategyLabel, /Submit claims/)
  assert.equal(plan[1].role, 'backup')
  assert.equal(plan[1].backupFor, 1)
})
