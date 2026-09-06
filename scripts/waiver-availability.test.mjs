import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseEspnWaiverAvailability,
  validateWaiverAvailabilityInput,
} from '../src/features/waivers/waiverAvailability.ts'

const fixture = {
  id: 987654321,
  seasonId: 2026,
  scoringPeriodId: 2,
  settings: {
    name: 'Public Test League',
    size: 2,
    acquisitionSettings: {
      isUsingAcquisitionBudget: true,
      acquisitionBudget: 100,
    },
  },
  teams: [
    {
      id: 1,
      name: 'My Team',
      waiverRank: 3,
      transactionCounter: { acquisitionBudgetSpent: 27 },
      roster: {
        entries: [
          { lineupSlotId: 0, playerId: 101, playerPoolEntry: { player: { id: 101, fullName: 'Jordan Love', defaultPositionId: 1, proTeamId: 9 } } },
          { lineupSlotId: 20, playerId: 102, playerPoolEntry: { player: { id: 102, fullName: 'Josh Downs', defaultPositionId: 3, proTeamId: 11 } } },
        ],
      },
    },
    {
      id: 2,
      name: 'Other Team',
      roster: {
        entries: [
          { lineupSlotId: 0, playerId: 201, playerPoolEntry: { player: { id: 201, fullName: 'Bijan Robinson', defaultPositionId: 2, proTeamId: 1 } } },
          { lineupSlotId: 20, playerId: 202, playerPoolEntry: { player: { id: 202, fullName: 'IDP Player', defaultPositionId: 9, proTeamId: 23 } } },
        ],
      },
    },
  ],
}

test('waiver availability input validates league, season, and selected team', () => {
  assert.deepEqual(validateWaiverAvailabilityInput(' 987654321 ', '2026', '2', 2026), {
    leagueId: '987654321',
    season: 2026,
    teamId: 2,
  })
  assert.throws(() => validateWaiverAvailabilityInput('123', '2026', '0', 2026), /valid ESPN fantasy team/)
})

test('ESPN waiver parser verifies coverage across every supported league roster', () => {
  const result = parseEspnWaiverAvailability(
    fixture,
    { leagueId: '987654321', season: 2026, teamId: 1 },
    '2026-09-06T12:00:00.000Z',
  )

  assert.equal(result.coverage.teams, 2)
  assert.equal(result.coverage.rosteredPlayers, 3)
  assert.deepEqual(result.rosteredPlayers.map((player) => [player.name, player.position, player.fantasyTeamId]), [
    ['Bijan Robinson', 'RB', 2],
    ['Jordan Love', 'QB', 1],
    ['Josh Downs', 'WR', 1],
  ])
})

test('ESPN FAAB settings normalize remaining budget without granting write access', () => {
  const result = parseEspnWaiverAvailability(fixture, { leagueId: '987654321', season: 2026, teamId: 1 })

  assert.deepEqual(result.claimRules, {
    mode: 'faab',
    budgetTotal: 100,
    budgetSpent: 27,
    budgetRemaining: 73,
    waiverRank: 3,
  })
  assert.equal(result.provider.access, 'read-only')
})

test('leagues without acquisition budgets use priority strategy', () => {
  const priorityFixture = structuredClone(fixture)
  priorityFixture.settings.acquisitionSettings.isUsingAcquisitionBudget = false
  const result = parseEspnWaiverAvailability(priorityFixture, { leagueId: '987654321', season: 2026, teamId: 1 })

  assert.deepEqual(result.claimRules, { mode: 'priority', waiverRank: 3 })
})

test('parser rejects a stale or missing selected ESPN team', () => {
  assert.throws(
    () => parseEspnWaiverAvailability(fixture, { leagueId: '987654321', season: 2026, teamId: 99 }),
    /did not return the selected fantasy team/,
  )
})

test('parser rejects incomplete team coverage instead of creating false availability', () => {
  const incomplete = structuredClone(fixture)
  incomplete.settings.size = 3

  assert.throws(
    () => parseEspnWaiverAvailability(incomplete, { leagueId: '987654321', season: 2026, teamId: 1 }),
    /complete roster snapshot/,
  )
})
