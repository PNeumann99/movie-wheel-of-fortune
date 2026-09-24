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
  const details = { title: 'A Movie', release_date: '2020-01-01', genres: [{ name: 'TV Movie' }, { name: 'Science Fiction' }] }
  const providers = { results: { DE: { flatrate: [{ provider_id: 337 }, { provider_id: 119 }] } } }
  assert.deepEqual(tmdbMovieDetails(details, providers), {
    title: 'A Movie', year: 2020, genre: 'Science Fiction', streamingService: 'Amazon Prime Video',
  })
  assert.deepEqual(tmdbMovieDetails({ title: 'A Movie', genres: [] }, { results: {} }), {
    title: 'A Movie', year: null, genre: 'Other', streamingService: null,
  })
})
