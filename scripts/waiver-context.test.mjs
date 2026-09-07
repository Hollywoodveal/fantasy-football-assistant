import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEspnScoreboardUrl,
  parseWaiverWeekContext,
  validateWaiverWeekContextInput,
} from '../src/features/waivers/waiverContext.ts'

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

test('waiver matchup input validates the public NFL season and week', () => {
  assert.deepEqual(validateWaiverWeekContextInput('2026', '1', 2026), { season: 2026, week: 1 })
  assert.throws(() => validateWaiverWeekContextInput('2026', '19', 2026), /between 1 and 18/)

  const url = new URL(buildEspnScoreboardUrl(2026, 1))
  assert.equal(url.hostname, 'site.api.espn.com')
  assert.equal(url.searchParams.get('week'), '1')
})

test('public scoreboard data becomes deterministic team matchup context', () => {
  const result = parseWaiverWeekContext(scoreboardFixture, { season: 2026, week: 1 }, '2026-09-07T00:00:00.000Z')

  assert.equal(result.provider.access, 'read-only')
  assert.equal(result.teams.length, 2)
  assert.deepEqual(result.teams[0], {
    team: 'GB',
    opponent: 'PHI',
    homeAway: 'away',
    kickoff: '2026-09-13T17:00:00Z',
    gameStatus: 'scheduled',
  })
})

test('an empty provider response never fabricates matchup context', () => {
  assert.throws(
    () => parseWaiverWeekContext({ events: [] }, { season: 2026, week: 1 }),
    /no NFL matchups/,
  )
})
