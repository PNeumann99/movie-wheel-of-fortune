import assert from 'node:assert/strict'
import test from 'node:test'
import { filterMovies, type MovieFilters } from './filters.ts'
import type { Movie } from './types.ts'

const movies: Movie[] = [
  { id: 'horror', title: 'Horror', year: 1980, genre: 'Horror', weight: 2, status: 'backlog', createdAt: 1, addedBy: 'alice' },
  { id: 'comedy', title: 'Comedy', year: 2020, genre: 'Comedy', weight: 1, status: 'backlog', createdAt: 2, addedBy: 'bob' },
  { id: 'legacy', title: 'Legacy', year: null, weight: 3, status: 'backlog', createdAt: 3, addedBy: 'alice' },
  { id: 'drama', title: 'Drama', year: 2010, genre: 'Drama', weight: 4, status: 'watched', createdAt: 4, addedBy: 'bob' },
]

const defaults: MovieFilters = { excludedGenres: [], minYear: null, maxYear: null, addedBy: null }
const ids = (filters: MovieFilters) => filterMovies(movies, filters).map((movie) => movie.id)

test('genre exclusions remove matching movies while keeping legacy movies', () => {
  assert.deepEqual(ids({ ...defaults, excludedGenres: ['Horror'] }), ['comedy', 'legacy'])
})

test('year limits are inclusive and exclude movies without a year', () => {
  assert.deepEqual(ids({ ...defaults, minYear: 1980, maxYear: 2020 }), ['horror', 'comedy'])
  assert.deepEqual(ids({ ...defaults, minYear: 2000, maxYear: null }), ['comedy'])
})

test('contributor and other filters combine and watched movies never qualify', () => {
  assert.deepEqual(ids({ ...defaults, addedBy: 'alice' }), ['horror', 'legacy'])
  assert.deepEqual(ids({ ...defaults, addedBy: 'alice', excludedGenres: ['Horror'], minYear: 1900 }), [])
  assert.deepEqual(ids(defaults), ['horror', 'comedy', 'legacy'])
})
