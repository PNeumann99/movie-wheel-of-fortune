import assert from 'node:assert/strict'
import test from 'node:test'
import { getWheelSegments, pickWeightedMovie } from './wheel.ts'
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
