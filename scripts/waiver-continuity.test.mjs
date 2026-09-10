import assert from 'node:assert/strict'
import test from 'node:test'
import {
  diffRosters,
  markWaiverClaimSkipped,
  mergeContinuityRecord,
  reconcileWaiverResults,
} from '../src/features/waivers/waiverContinuity.ts'

const rosterPlayer = (id, name, position = 'WR', slot = 'Bench', nflTeam = 'FA') => ({
  id,
  name,
  position,
  slot,
  nflTeam,
})
const claim = (id, name, order, position = 'WR', nflTeam = 'FA') => ({
  order,
  recommendation: {
    candidate: {
      id,
      name,
      position,
      nflTeam,
    },
    drop: null,
    projectedGain: 4.5,
  },
  strategyLabel: 'Submit claims in this order',
})

test('roster continuity detects ESPN additions and drops by stable player id', () => {
  const previous = [
    rosterPlayer('espn-1', 'Hold Player'),
    rosterPlayer('espn-2', 'Dropped Player'),
  ]
  const current = [
    rosterPlayer('espn-1', 'Hold Player', 'WR', 'Starter'),
    rosterPlayer('espn-3', 'Added Player'),
  ]

  const result = diffRosters(previous, current)
  assert.deepEqual(result.added.map((player) => player.name), ['Added Player'])
  assert.deepEqual(result.dropped.map((player) => player.name), ['Dropped Player'])
})

test('planned claims reconcile as won, lost, or pending from a complete ESPN snapshot', () => {
  const result = reconcileWaiverResults({
    leagueId: '123',
    teamId: 4,
    season: 2026,
    week: 2,
    syncedAt: '2026-09-16T12:00:00.000Z',
    previousRoster: [rosterPlayer('espn-1', 'Original Player')],
    currentRoster: [
      rosterPlayer('espn-1', 'Original Player'),
      rosterPlayer('espn-20', 'Won Player'),
    ],
    claimPlan: [
      claim('waiver-20', 'Won Player', 1),
      claim('waiver-21', 'Lost Player', 2),
      claim('waiver-22', 'Pending Player', 3),
    ],
    rosteredPlayers: [
      { providerPlayerId: '20', name: 'Won Player', position: 'WR', nflTeam: 'FA', fantasyTeamId: 4, fantasyTeamName: 'My Team' },
      { providerPlayerId: '21', name: 'Lost Player', position: 'WR', nflTeam: 'FA', fantasyTeamId: 8, fantasyTeamName: 'Opponent' },
    ],
  })

  assert.deepEqual(result.claims.map((item) => item.status), ['won', 'lost', 'pending'])
  assert.equal(result.verification, 'all-rosters')
  assert.equal(result.lineupRefreshRequired, true)
})

test('FAAB change is recorded without inventing spend when balances are unavailable', () => {
  const base = {
    leagueId: '123',
    teamId: 4,
    season: 2026,
    week: 2,
    syncedAt: '2026-09-16T12:00:00.000Z',
    previousRoster: [],
    currentRoster: [],
    claimPlan: [],
  }

  assert.equal(reconcileWaiverResults({ ...base, previousFaabRemaining: 72, currentFaabRemaining: 61 }).faabSpent, 11)
  assert.equal(reconcileWaiverResults(base).faabSpent, undefined)
})

test('history merge preserves resolved outcomes and accumulates weekly roster changes', () => {
  const previous = reconcileWaiverResults({
    leagueId: '123', teamId: 4, season: 2026, week: 2,
    syncedAt: '2026-09-16T12:00:00.000Z',
    previousRoster: [],
    currentRoster: [rosterPlayer('espn-20', 'Won Player')],
    claimPlan: [claim('waiver-20', 'Won Player', 1)],
    rosteredPlayers: [],
    previousFaabRemaining: 100,
    currentFaabRemaining: 90,
  })
  const next = reconcileWaiverResults({
    leagueId: '123', teamId: 4, season: 2026, week: 2,
    syncedAt: '2026-09-17T12:00:00.000Z',
    previousRoster: [rosterPlayer('espn-20', 'Won Player')],
    currentRoster: [
      rosterPlayer('espn-20', 'Won Player'),
      rosterPlayer('espn-30', 'Second Player', 'RB'),
    ],
    claimPlan: [],
    rosteredPlayers: [],
    previousFaabRemaining: 90,
    currentFaabRemaining: 85,
  })

  const merged = mergeContinuityRecord(previous, next)
  assert.deepEqual(merged.added.map((player) => player.name), ['Won Player', 'Second Player'])
  assert.equal(merged.claims[0]?.status, 'won')
  assert.equal(merged.faabSpent, 15)
})

test('a pending claim can be explicitly marked skipped', () => {
  const record = reconcileWaiverResults({
    leagueId: '123', teamId: 4, season: 2026, week: 2,
    syncedAt: '2026-09-16T12:00:00.000Z',
    previousRoster: [], currentRoster: [],
    claimPlan: [claim('waiver-22', 'Pending Player', 1)],
  })
  const updated = markWaiverClaimSkipped(record, 'waiver-22', '2026-09-17T12:00:00.000Z')

  assert.equal(updated.claims[0]?.status, 'skipped')
  assert.equal(updated.claims[0]?.resolvedAt, '2026-09-17T12:00:00.000Z')
})
