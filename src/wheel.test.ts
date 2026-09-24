import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceSpinCooldowns, coolDownMovie, getWheelSegments, pickWeightedMovie, withSpinCooldowns } from './wheel.ts'
import type { Movie } from './types.ts'

const movies: Movie[] = [
  { id: 'a', title: 'A', year: null, weight: 1, status: 'backlog', createdAt: 1, addedBy: 'test' },
  { id: 'b', title: 'B', year: null, weight: 3, status: 'backlog', createdAt: 2, addedBy: 'test' },
]

test('wheel slices match the exact weighted odds', () => {
  const segments = getWheelSegments(movies)
  assert.equal(segments[0].sweepAngle, 90)
  assert.equal(segments[1].sweepAngle, 270)
  assert.equal(segments[1].chance, 0.75)
})

test('weighted selection respects segment boundaries', () => {
  assert.equal(pickWeightedMovie(movies, () => 0)?.id, 'a')
  assert.equal(pickWeightedMovie(movies, () => 0.249)?.id, 'a')
  assert.equal(pickWeightedMovie(movies, () => 0.25)?.id, 'b')
  assert.equal(pickWeightedMovie(movies, () => 0.999)?.id, 'b')
  assert.equal(pickWeightedMovie([], () => 0), null)
})

test('rejected movies get smaller slices for exactly three future spins', () => {
  let cooldowns = coolDownMovie({}, 'b')
  for (let spin = 0; spin < 3; spin++) {
    assert.equal(cooldowns.b, 3 - spin)
    const effective = withSpinCooldowns(movies, cooldowns)
    assert.equal(effective[0].weight, 1)
    assert.equal(effective[1].weight, 0.75)
    assert.equal(getWheelSegments(effective)[1].chance, 0.75 / 1.75)
    assert.equal(pickWeightedMovie(effective, () => 0.6)?.id, 'b')
    cooldowns = advanceSpinCooldowns(cooldowns)
  }
  assert.deepEqual(cooldowns, {})
  assert.equal(getWheelSegments(withSpinCooldowns(movies, cooldowns))[1].chance, 0.75)
})

test('rejecting a title again restarts its three-spin cooldown', () => {
  const cooldowns = advanceSpinCooldowns(coolDownMovie({}, 'a'))
  assert.equal(coolDownMovie(cooldowns, 'a').a, 3)
})
