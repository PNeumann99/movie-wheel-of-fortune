import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getMovieStats } from './stats.ts'
import type { Movie } from './types.ts'

const now = Date.UTC(2026, 8, 28)

function movie(id: string, changes: Partial<Movie> = {}): Movie {
  return {
    id,
    title: id,
    year: null,
    weight: 1,
    status: 'backlog',
    createdAt: now - 5 * 86_400_000,
    addedBy: 'member',
    ...changes,
  }
}

test('empty list has helpful empty statistics', () => {
  assert.deepEqual(getMovieStats([], now), {
    watchedCount: 0,
    watchedMovies: 0,
    watchedSeries: 0,
    topGenres: [],
    topGenreCount: 0,
    watchedRuntimeMinutes: 0,
    runtimeMovieCount: 0,
    averageReleaseYear: null,
    releaseYearCount: 0,
    oldestBacklog: null,
  })
})

test('statistics use watched titles and only known movie runtimes', () => {
  const movies = [
    movie('A', { status: 'watched', genre: 'Drama', year: 2000, runtimeMinutes: 120 }),
    movie('B', { status: 'watched', kind: 'series', genre: 'Drama', year: 2020, runtimeMinutes: 600 }),
    movie('C', { status: 'watched', genre: 'Comedy', year: null }),
    movie('D', { status: 'backlog', genre: 'Comedy', year: 1980, runtimeMinutes: 90 }),
  ]
  const stats = getMovieStats(movies, now)

  assert.equal(stats.watchedCount, 3)
  assert.equal(stats.watchedMovies, 2) // Entries before the kind field are movies.
  assert.equal(stats.watchedSeries, 1)
  assert.deepEqual(stats.topGenres, ['Drama'])
  assert.equal(stats.topGenreCount, 2)
  assert.equal(stats.watchedRuntimeMinutes, 120)
  assert.equal(stats.runtimeMovieCount, 1)
  assert.equal(stats.averageReleaseYear, 2010)
  assert.equal(stats.releaseYearCount, 2)
})

test('genre ties are stable and oldest backlog ignores preview placeholder dates', () => {
  const oldest = movie('Oldest', { createdAt: now - 12 * 86_400_000 })
  const stats = getMovieStats([
    movie('Preview', { createdAt: 1 }),
    movie('Newer', { createdAt: now - 2 * 86_400_000 }),
    oldest,
    movie('Future', { createdAt: now + 86_400_000 }),
    movie('Viewed', { status: 'watched', createdAt: now - 50 * 86_400_000, genre: 'Thriller' }),
    movie('Viewed too', { status: 'watched', genre: 'Action' }),
  ], now)

  assert.deepEqual(stats.topGenres, ['Action', 'Thriller'])
  assert.equal(stats.oldestBacklog?.movie.id, 'Oldest')
  assert.equal(stats.oldestBacklog?.daysWaiting, 12)
})

test('missing metadata never contributes to year, runtime, or genre averages', () => {
  const stats = getMovieStats([
    movie('Legacy watched', { status: 'watched', year: null, runtimeMinutes: null }),
    movie('Invalid year', { status: 'watched', year: 3000, runtimeMinutes: 0 }),
  ], now)

  assert.equal(stats.watchedCount, 2)
  assert.equal(stats.averageReleaseYear, null)
  assert.equal(stats.runtimeMovieCount, 0)
  assert.deepEqual(stats.topGenres, [])
})
