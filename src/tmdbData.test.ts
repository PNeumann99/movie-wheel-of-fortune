import assert from 'node:assert/strict'
import test from 'node:test'
import { tmdbMovieDetails, tmdbSearchResults } from './tmdbData.ts'

test('search results keep usable movie metadata and reject unsafe poster paths', () => {
  assert.deepEqual(tmdbSearchResults({ results: [
    { id: 1, title: 'Arrival', release_date: '2016-11-10', overview: 'First contact.', poster_path: '/arrival.jpg' },
    { id: 2, title: 'Unknown year', release_date: '', poster_path: 'https://another.example/poster.jpg' },
    { id: null, title: 'Broken result' },
  ] }), [
    { id: 1, title: 'Arrival', year: 2016, overview: 'First contact.', posterPath: '/arrival.jpg' },
    { id: 2, title: 'Unknown year', year: null, overview: '', posterPath: null },
  ])
})

test('details pick an app genre and a German subscription provider', () => {
  const details = { id: 123, title: 'A Movie', overview: 'A story worth saving.', poster_path: '/poster.jpg', release_date: '2020-01-01', runtime: 123, genres: [{ name: 'TV Movie' }, { name: 'Science Fiction' }] }
  const providers = { results: { DE: { flatrate: [{ provider_id: 337 }, { provider_id: 119 }] } } }
  assert.deepEqual(tmdbMovieDetails(details, providers), {
    title: 'A Movie', year: 2020, runtimeMinutes: 123, genre: 'Science Fiction', streamingService: 'Amazon Prime Video',
    tmdbId: 123, posterPath: '/poster.jpg', overview: 'A story worth saving.',
  })
  assert.deepEqual(tmdbMovieDetails({ title: 'A Movie', genres: [] }, { results: {} }), {
    title: 'A Movie', year: null, runtimeMinutes: null, genre: 'Other', streamingService: null,
    tmdbId: null, posterPath: null, overview: '',
  })
  assert.equal(tmdbMovieDetails({ title: 'A Movie', runtime: 0 }, null).runtimeMinutes, null)
  assert.equal(tmdbMovieDetails({ title: 'A Movie', runtime: '123' }, null).runtimeMinutes, null)
})

test('saved TMDB metadata rejects external poster URLs and bounds descriptions', () => {
  const details = tmdbMovieDetails({ title: 'Example', id: -1, poster_path: 'https://example.com/image.jpg', overview: 'x'.repeat(6000) }, null)
  assert.equal(details.posterPath, null)
  assert.equal(details.tmdbId, null)
  assert.equal(details.overview.length, 5000)
})
