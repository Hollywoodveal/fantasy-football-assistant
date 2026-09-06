import assert from 'node:assert/strict'
import test from 'node:test'
import { enrichRoster, optimizeLineup } from '../src/features/lineup/lineupEngine.ts'

const player = (name, position, slot, nflTeam = 'FA') => ({
  id: `${position}-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`,
  name,
  position,
  nflTeam,
  slot,
})

test('optimizer promotes the best available bench player into an open flex slot', () => {
  const result = optimizeLineup([
    player('Starter QB', 'QB', 'Starter'),
    player('Starter RB One', 'RB', 'Starter'),
    player('Starter RB Two', 'RB', 'Starter'),
    player('Starter WR One', 'WR', 'Starter'),
    player('Starter WR Two', 'WR', 'Starter'),
    player('Starter TE', 'TE', 'Starter'),
    player('Starter K', 'K', 'Starter'),
    player('Starter Defense', 'D/ST', 'Starter'),
    player('Bench WR', 'WR', 'Bench'),
  ])

  const flex = result.optimized.find((assignment) => assignment.slot === 'FLEX')
  assert.equal(flex?.player?.name, 'Bench WR')
  assert.ok(result.projectedGain > 0)
  assert.equal(result.swaps[0]?.bench.name, 'Bench WR')
})

test('optimizer never assigns a player twice while filling duplicate position slots', () => {
  const result = optimizeLineup([
    player('Quarterback', 'QB', 'Starter'),
    player('Running Back One', 'RB', 'Starter'),
    player('Running Back Two', 'RB', 'Bench'),
    player('Wide Receiver One', 'WR', 'Starter'),
    player('Tight End', 'TE', 'Starter'),
    player('Kicker', 'K', 'Starter'),
    player('Defense', 'D/ST', 'Starter'),
  ])

  const assignedIds = result.optimized.flatMap((assignment) => assignment.player ? [assignment.player.id] : [])
  assert.equal(new Set(assignedIds).size, assignedIds.length)
  assert.equal(result.optimized.filter((assignment) => assignment.slot === 'RB' && assignment.player).length, 2)
})

test('IR players are excluded and surfaced as a warning', () => {
  const result = optimizeLineup([
    player('Quarterback', 'QB', 'Starter'),
    player('Injured Receiver', 'WR', 'IR'),
  ])

  assert.equal(result.optimized.some((assignment) => assignment.player?.name === 'Injured Receiver'), false)
  assert.ok(result.warnings.some((warning) => warning.includes('IR player')))
})

test('ESPN weekly projections override estimates and exclude out players', () => {
  const starter = player('Starter Receiver', 'WR', 'Starter')
  const bench = player('Bench Receiver', 'WR', 'Bench')
  const result = optimizeLineup([starter, bench], {
    weeklyIntelligence: [
      {
        playerId: starter.id,
        providerPlayerId: '1',
        name: starter.name,
        position: 'WR',
        nflTeam: 'FA',
        rosterSlot: 'Starter',
        projectedPoints: 18.5,
        injuryStatus: 'OUT',
        availability: 'out',
        gameStatus: 'scheduled',
        confidence: 'high',
      },
      {
        playerId: bench.id,
        providerPlayerId: '2',
        name: bench.name,
        position: 'WR',
        nflTeam: 'FA',
        rosterSlot: 'Bench',
        projectedPoints: 12.4,
        injuryStatus: 'ACTIVE',
        availability: 'active',
        opponent: 'ATL',
        homeAway: 'home',
        gameStatus: 'scheduled',
        confidence: 'high',
      },
    ],
  })

  assert.equal(result.current.find((assignment) => assignment.player?.id === starter.id)?.projectedPoints, 0)
  assert.equal(result.optimized.some((assignment) => assignment.player?.id === starter.id), false)
  assert.equal(result.optimized.some((assignment) => assignment.player?.id === bench.id), true)
  assert.equal(result.swaps[0]?.reason, 'Replaces an unavailable starter')
  assert.ok(result.swaps[0]?.reasons.some((reason) => reason.includes('Modeled range')))
  assert.ok(result.warnings.some((warning) => warning.includes('unavailable player')))
})

test('weekly projection versus neutral baseline creates a transparent matchup outlook and range', () => {
  const receiver = player('Outlook Receiver', 'WR', 'Starter', 'SEA')
  const [enriched] = enrichRoster([receiver], 'PPR', [{
    playerId: receiver.id,
    providerPlayerId: '10',
    name: receiver.name,
    position: 'WR',
    nflTeam: 'SEA',
    rosterSlot: 'Starter',
    projectedPoints: 18,
    injuryStatus: 'ACTIVE',
    availability: 'active',
    opponent: 'ARI',
    homeAway: 'home',
    gameStatus: 'scheduled',
    confidence: 'high',
  }])

  assert.equal(enriched.matchupOutlook, 'favorable')
  assert.ok(enriched.matchupDelta >= 1.5)
  assert.equal(enriched.riskLevel, 'low')
  assert.ok(enriched.floorPoints < enriched.projectedPoints)
  assert.ok(enriched.ceilingPoints > enriched.projectedPoints)
  assert.match(enriched.decisionSummary, /Favorable ESPN-adjusted outlook/)
})

test('injury uncertainty raises risk and lowers a comparable modeled floor', () => {
  const active = player('Active Receiver', 'WR', 'Starter', 'SEA')
  const questionable = player('Questionable Receiver', 'WR', 'Bench', 'SEA')
  const weekly = [active, questionable].map((candidate, index) => ({
    playerId: candidate.id,
    providerPlayerId: String(20 + index),
    name: candidate.name,
    position: 'WR',
    nflTeam: 'SEA',
    rosterSlot: candidate.slot,
    projectedPoints: 15,
    injuryStatus: index ? 'QUESTIONABLE' : 'ACTIVE',
    availability: index ? 'questionable' : 'active',
    opponent: 'ARI',
    homeAway: 'home',
    gameStatus: 'scheduled',
    confidence: 'high',
  }))
  const [activePlayer, questionablePlayer] = enrichRoster([active, questionable], 'PPR', weekly)

  assert.ok(questionablePlayer.riskScore > activePlayer.riskScore)
  assert.ok(questionablePlayer.floorPoints < activePlayer.floorPoints)
  assert.ok(questionablePlayer.riskFactors.includes('Questionable injury status'))
})

test('a safer bench player wins a close start-sit call with explicit tradeoff reasons', () => {
  const starterOne = player('Locked Receiver One', 'WR', 'Starter', 'SEA')
  const starterTwo = player('Locked Receiver Two', 'WR', 'Starter', 'DET')
  const riskyStarter = player('Risky Receiver', 'WR', 'Starter', 'CIN')
  const safeBench = player('Safe Receiver', 'WR', 'Bench', 'MIN')
  const roster = [starterOne, starterTwo, riskyStarter, safeBench]
  const projections = [18, 17, 15, 14.5]
  const weekly = roster.map((candidate, index) => ({
    playerId: candidate.id,
    providerPlayerId: String(30 + index),
    name: candidate.name,
    position: 'WR',
    nflTeam: candidate.nflTeam,
    rosterSlot: candidate.slot,
    projectedPoints: projections[index],
    injuryStatus: index === 2 ? 'QUESTIONABLE' : 'ACTIVE',
    availability: index === 2 ? 'questionable' : 'active',
    opponent: 'GB',
    homeAway: 'home',
    gameStatus: 'scheduled',
    confidence: 'high',
  }))
  const result = optimizeLineup(roster, { weeklyIntelligence: weekly })
  const swap = result.swaps.find((candidate) => candidate.bench.id === safeBench.id)

  assert.ok(swap)
  assert.equal(swap.starter?.id, riskyStarter.id)
  assert.equal(swap.reason, 'Safer start in a close projection')
  assert.equal(swap.gain, -0.5)
  assert.ok(swap.decisionGain > 0)
  assert.ok(swap.floorGain > 0)
  assert.ok(swap.riskImprovement > 0)
  assert.ok(swap.reasons.some((reason) => reason.includes('Lowers the lineup risk score')))
})

test('risk does not bench a clearly superior projection', () => {
  const strongStarter = player('Strong Questionable Receiver', 'WR', 'Starter', 'CIN')
  const safeBench = player('Healthy Bench Receiver', 'WR', 'Bench', 'MIN')
  const result = optimizeLineup([strongStarter, safeBench], {
    weeklyIntelligence: [
      {
        playerId: strongStarter.id,
        providerPlayerId: '40',
        name: strongStarter.name,
        position: 'WR',
        nflTeam: 'CIN',
        rosterSlot: 'Starter',
        projectedPoints: 20,
        injuryStatus: 'QUESTIONABLE',
        availability: 'questionable',
        opponent: 'CLE',
        homeAway: 'home',
        gameStatus: 'scheduled',
        confidence: 'high',
      },
      {
        playerId: safeBench.id,
        providerPlayerId: '41',
        name: safeBench.name,
        position: 'WR',
        nflTeam: 'MIN',
        rosterSlot: 'Bench',
        projectedPoints: 14.5,
        injuryStatus: 'ACTIVE',
        availability: 'active',
        opponent: 'GB',
        homeAway: 'away',
        gameStatus: 'scheduled',
        confidence: 'high',
      },
    ],
  })

  assert.equal(result.optimized.some((assignment) => assignment.player?.id === strongStarter.id), true)
  assert.equal(result.swaps.some((swap) => swap.starter?.id === strongStarter.id), false)
})
