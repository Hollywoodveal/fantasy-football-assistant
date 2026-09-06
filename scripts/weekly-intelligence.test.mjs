import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEspnScoreboardUrl,
  buildEspnWeeklyLeagueUrl,
  normalizeAvailability,
  parseWeeklyIntelligence,
  validateWeeklyIntelligenceInput,
} from '../src/features/lineup/weeklyIntelligence.ts'

const leagueFixture = {
  id: 987654321,
  teams: [{
    id: 1,
    roster: {
      entries: [
        {
          lineupSlotId: 0,
          playerId: 101,
          playerPoolEntry: {
            player: {
              id: 101,
              fullName: 'Jordan Love',
              defaultPositionId: 1,
              proTeamId: 9,
              injuryStatus: 'ACTIVE',
              stats: [
                { scoringPeriodId: 1, statSourceId: 1, appliedTotal: 19.24 },
                { scoringPeriodId: 1, statSourceId: 0, appliedTotal: 7.04 },
              ],
            },
          },
        },
        {
          lineupSlotId: 20,
          playerId: 102,
          playerPoolEntry: {
            player: {
              id: 102,
              fullName: 'Josh Downs',
              defaultPositionId: 3,
              proTeamId: 11,
              injuryStatus: 'QUESTIONABLE',
              stats: [{ scoringPeriodId: 1, statSourceId: 1, appliedTotal: 11.65 }],
            },
          },
        },
        {
          lineupSlotId: 21,
          playerId: 103,
          playerPoolEntry: {
            player: {
              id: 103,
              fullName: 'Ray Davis',
              defaultPositionId: 2,
              proTeamId: 2,
              injuryStatus: 'INJURY_RESERVE',
            },
          },
        },
        {
          lineupSlotId: 20,
          playerId: 104,
          playerPoolEntry: { player: { id: 104, fullName: 'Unsupported IDP', defaultPositionId: 9, proTeamId: 23 } },
        },
      ],
    },
  }],
}

const scoreboardFixture = {
  events: [{
    date: '2026-09-13T17:00:00Z',
    status: { type: { state: 'pre', completed: false } },
    competitions: [{
      competitors: [
        { homeAway: 'home', team: { abbreviation: 'PHI' } },
        { homeAway: 'away', team: { abbreviation: 'GB' } },
      ],
    }],
  }],
}

test('weekly input and provider URLs are constrained to a public league week', () => {
  assert.deepEqual(
    validateWeeklyIntelligenceInput(' 987654321 ', '2026', '1', '3', 2026),
    { leagueId: '987654321', season: 2026, week: 1, teamId: 3 },
  )
  assert.throws(() => validateWeeklyIntelligenceInput('123', '2026', '19', '3', 2026), /between 1 and 18/)

  const leagueUrl = new URL(buildEspnWeeklyLeagueUrl('987654321', 2026, 1))
  assert.equal(leagueUrl.searchParams.get('scoringPeriodId'), '1')
  assert.deepEqual(leagueUrl.searchParams.getAll('view'), ['mRoster', 'mMatchup', 'mStatus'])

  const scheduleUrl = new URL(buildEspnScoreboardUrl(2026, 1))
  assert.equal(scheduleUrl.hostname, 'site.api.espn.com')
  assert.equal(scheduleUrl.searchParams.get('week'), '1')
})

test('weekly ESPN roster fields become projections, matchup context, and coverage', () => {
  const result = parseWeeklyIntelligence(
    leagueFixture,
    scoreboardFixture,
    { leagueId: '987654321', season: 2026, week: 1, teamId: 1 },
    '2026-09-05T18:00:00.000Z',
  )

  assert.equal(result.players.length, 3)
  assert.deepEqual(result.coverage, {
    rosterPlayers: 3,
    projectedPlayers: 2,
    statusPlayers: 3,
    scheduledPlayers: 1,
  })
  assert.deepEqual(result.players[0], {
    playerId: 'espn-101',
    providerPlayerId: '101',
    name: 'Jordan Love',
    position: 'QB',
    nflTeam: 'GB',
    rosterSlot: 'Starter',
    projectedPoints: 19.2,
    actualPoints: 7,
    injuryStatus: 'ACTIVE',
    availability: 'active',
    opponent: 'PHI',
    homeAway: 'away',
    kickoff: '2026-09-13T17:00:00Z',
    gameStatus: 'scheduled',
    confidence: 'high',
  })
  assert.equal(result.players[1].availability, 'questionable')
  assert.equal(result.players[1].gameStatus, 'bye')
  assert.equal(result.players[2].availability, 'out')
})

test('injury normalization protects lineup decisions from ESPN label variants', () => {
  assert.equal(normalizeAvailability('Injury Reserve'), 'out')
  assert.equal(normalizeAvailability('DOUBTFUL'), 'doubtful')
  assert.equal(normalizeAvailability('Questionable'), 'questionable')
  assert.equal(normalizeAvailability('ACTIVE'), 'active')
})

test('missing scoreboard data stays unknown instead of creating false bye weeks', () => {
  const result = parseWeeklyIntelligence(
    leagueFixture,
    undefined,
    { leagueId: '987654321', season: 2026, week: 1, teamId: 1 },
  )

  assert.ok(result.players.every((player) => player.gameStatus === 'unknown'))
  assert.equal(result.coverage.scheduledPlayers, 0)
})
