import assert from 'node:assert/strict'
import test from 'node:test'
import { optimizeLineup } from '../src/features/lineup/lineupEngine.ts'

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
