import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEspnLeagueUrl,
  parseEspnLeague,
  profileFromEspnLeague,
  validateEspnSyncInput,
} from '../src/features/league/espnSync.ts'

const fixture = {
  id: 987654321,
  seasonId: 2026,
  scoringPeriodId: 4,
  settings: {
    name: 'The League of Ordinary Gentlemen',
    size: 12,
    scoringSettings: { scoringItems: [{ statId: 53, points: 1 }] },
  },
  teams: [
    {
      id: 2,
      name: 'Gridiron Kings',
      abbreviation: 'GK',
      roster: { entries: [] },
    },
    {
      id: 1,
      name: 'Hollywood Veal',
      abbreviation: 'HV',
      roster: {
        entries: [
          { lineupSlotId: 0, playerId: 101, playerPoolEntry: { player: { id: 101, fullName: 'Jordan Love', defaultPositionId: 1, proTeamId: 9 } } },
          { lineupSlotId: 20, playerId: 102, playerPoolEntry: { player: { id: 102, fullName: 'Josh Downs', defaultPositionId: 3, proTeamId: 11 } } },
          { lineupSlotId: 21, playerId: 103, playerPoolEntry: { player: { id: 103, fullName: 'Ray Davis', defaultPositionId: 2, proTeamId: 2 } } },
          { lineupSlotId: 20, playerId: 104, playerPoolEntry: { player: { id: 104, fullName: 'IDP Player', defaultPositionId: 9, proTeamId: 23 } } },
        ],
      },
    },
  ],
}

test('ESPN sync input accepts numeric public league IDs and constrained seasons', () => {
  assert.deepEqual(validateEspnSyncInput(' 987654321 ', '2026', 2026), { leagueId: '987654321', season: 2026 })
  assert.throws(() => validateEspnSyncInput('league-123', '2026', 2026), /numeric ESPN League ID/)
  assert.throws(() => validateEspnSyncInput('123', '2030', 2026), /between 2024 and 2027/)
})

test('ESPN provider URL requests settings, teams, and rosters without credentials', () => {
  const url = new URL(buildEspnLeagueUrl('987654321', 2026))
  assert.equal(url.hostname, 'lm-api-reads.fantasy.espn.com')
  assert.equal(url.pathname, '/apis/v3/games/ffl/seasons/2026/segments/0/leagues/987654321')
  assert.deepEqual(url.searchParams.getAll('view'), ['mSettings', 'mTeam', 'mRoster'])
})

test('ESPN payload is normalized into supported roster positions and slots', () => {
  const result = parseEspnLeague(fixture, '987654321', 2026, '2026-09-05T12:00:00.000Z')
  const team = result.teams.find((candidate) => candidate.id === 1)

  assert.equal(result.leagueName, 'The League of Ordinary Gentlemen')
  assert.equal(result.scoring, 'PPR')
  assert.equal(result.teamCount, 12)
  assert.deepEqual(team?.roster.map((player) => [player.name, player.position, player.nflTeam, player.slot]), [
    ['Jordan Love', 'QB', 'GB', 'Starter'],
    ['Josh Downs', 'WR', 'IND', 'Bench'],
    ['Ray Davis', 'RB', 'BUF', 'IR'],
  ])
})

test('selected ESPN team becomes a refreshable local LeagueProfile', () => {
  const result = parseEspnLeague(fixture, '987654321', 2026, '2026-09-05T12:00:00.000Z')
  const profile = profileFromEspnLeague(result, 1)

  assert.equal(profile.teamName, 'Hollywood Veal')
  assert.equal(profile.roster.length, 3)
  assert.deepEqual(profile.sync, {
    mode: 'espn-public',
    teamId: 1,
    scoringPeriodId: 4,
    lastSyncedAt: '2026-09-05T12:00:00.000Z',
  })
})
