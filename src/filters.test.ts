import assert from 'node:assert/strict'
import test from 'node:test'
import { filterMovies, type MovieFilters } from './filters.ts'
import type { Movie } from './types.ts'

const movies: Movie[] = [
  { id: 'horror', title: 'Horror', year: 1980, genre: 'Horror', streamingService: 'Netflix', weight: 2, status: 'backlog', createdAt: 1, addedBy: 'alice' },
  { id: 'comedy', title: 'Comedy', year: 2020, genre: 'Comedy', streamingService: null, weight: 1, status: 'backlog', createdAt: 2, addedBy: 'bob' },
  { id: 'legacy', title: 'Legacy', year: null, weight: 3, status: 'backlog', createdAt: 3, addedBy: 'alice' },
  { id: 'series', title: 'A Series', kind: 'series', year: 2022, genre: 'Comedy', streamingService: 'Disney+', weight: 2, status: 'backlog', createdAt: 5, addedBy: 'bob' },
  { id: 'drama', title: 'Drama', year: 2010, genre: 'Drama', streamingService: 'Amazon Prime Video', weight: 4, status: 'watched', createdAt: 4, addedBy: 'bob' },
]

const defaults: MovieFilters = { excludedGenres: [], requireStreamingService: false, excludeSeries: false, minYear: null, maxYear: null, addedBy: null }
const ids = (filters: MovieFilters) => filterMovies(movies, filters).map((movie) => movie.id)

test('genre exclusions remove matching movies while keeping legacy movies', () => {
  assert.deepEqual(ids({ ...defaults, excludedGenres: ['Horror'] }), ['comedy', 'legacy', 'series'])
})

test('year limits are inclusive and exclude movies without a year', () => {
  assert.deepEqual(ids({ ...defaults, minYear: 1980, maxYear: 2020 }), ['horror', 'comedy'])
  assert.deepEqual(ids({ ...defaults, minYear: 2000, maxYear: null }), ['comedy', 'series'])
})

test('contributor and other filters combine and watched movies never qualify', () => {
  assert.deepEqual(ids({ ...defaults, addedBy: 'alice' }), ['horror', 'legacy'])
  assert.deepEqual(ids({ ...defaults, addedBy: 'alice', excludedGenres: ['Horror'], minYear: 1900 }), [])
  assert.deepEqual(ids(defaults), ['horror', 'comedy', 'legacy', 'series'])
})

test('skipping series leaves movies and legacy entries eligible and combines with other filters', () => {
  assert.deepEqual(ids({ ...defaults, excludeSeries: true }), ['horror', 'comedy', 'legacy'])
  assert.deepEqual(ids({ ...defaults, excludeSeries: true, addedBy: 'bob' }), ['comedy'])
  assert.deepEqual(ids({ ...defaults, excludeSeries: true, excludedGenres: ['Horror'] }), ['comedy', 'legacy'])
})

test('streaming only excludes null and missing services, including legacy entries', () => {
  assert.deepEqual(ids({ ...defaults, requireStreamingService: true }), ['horror', 'series'])
  assert.deepEqual(ids({ ...defaults, requireStreamingService: false }), ['horror', 'comedy', 'legacy', 'series'])
  const primeMovie = { ...movies[0], streamingService: 'Amazon Prime Video' as const }
  assert.deepEqual(filterMovies([primeMovie], { ...defaults, requireStreamingService: true }), [primeMovie])
})

test('streaming only combines with series, genre, year, and contributor filters', () => {
  const streamingOnly = { ...defaults, requireStreamingService: true }
  assert.deepEqual(ids({ ...streamingOnly, excludeSeries: true }), ['horror'])
  assert.deepEqual(ids({ ...streamingOnly, excludedGenres: ['Horror'] }), ['series'])
  assert.deepEqual(ids({ ...streamingOnly, minYear: 2000, maxYear: 2022 }), ['series'])
  assert.deepEqual(ids({ ...streamingOnly, addedBy: 'bob' }), ['series'])
  assert.deepEqual(ids({ ...streamingOnly, excludeSeries: true, addedBy: 'bob' }), [])
})
