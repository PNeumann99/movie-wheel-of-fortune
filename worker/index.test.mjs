import assert from 'node:assert/strict'
import test from 'node:test'
import worker, { handleRequest } from './index.js'

const env = {
  FIREBASE_PROJECT_ID_SECRET: 'demo-movie-wheel',
  TMDB_READ_ACCESS_TOKEN: 'server-secret',
  ALLOWED_ORIGINS: 'https://pneumann99.github.io',
}
const token = `header.${Buffer.from(JSON.stringify({
  aud: env.FIREBASE_PROJECT_ID_SECRET,
  iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID_SECRET}`,
  sub: 'alice',
})).toString('base64url')}.signature`

function request(path, origin = 'https://pneumann99.github.io') {
  return new Request(`https://movie-wheel-tmdb.example${path}`, {
    headers: { Origin: origin, Authorization: `Bearer ${token}` },
  })
}

test('only members can search, and the TMDB token stays on the server', async () => {
  const calls = []
  const fetcher = async (url, options) => {
    calls.push([url, options.headers.Authorization])
    if (url.includes('firestore.googleapis.com')) return new Response('{}')
    return Response.json({ results: [{ id: 13, title: 'Arrival', release_date: '2016-11-10' }] })
  }
  const response = await handleRequest(request('/search?q=Arrival'), env, fetcher)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { results: [{ id: 13, title: 'Arrival', year: 2016, overview: '', posterPath: null }] })
  assert.match(calls[0][0], /documents\/members\/alice$/)
  assert.equal(calls[0][1], `Bearer ${token}`)
  assert.equal(calls[1][1], 'Bearer server-secret')
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://pneumann99.github.io')

  const denied = await handleRequest(request('/search?q=Arrival'), env, async () => new Response('{}', { status: 404 }))
  assert.equal(denied.status, 403)
})

test('movie details include German subscription availability', async () => {
  const fetcher = async (url) => {
    if (url.includes('firestore.googleapis.com')) return new Response('{}')
    if (url.endsWith('/watch/providers')) return Response.json({ results: { DE: { flatrate: [{ provider_id: 337 }] } } })
    return Response.json({ title: 'Arrival', release_date: '2016-11-10', genres: [{ name: 'Science Fiction' }] })
  }
  const response = await handleRequest(request('/movie/13'), env, fetcher)
  assert.deepEqual(await response.json(), {
    movie: { title: 'Arrival', year: 2016, genre: 'Science Fiction', streamingService: 'Disney+' },
  })
})

test('movie details still load when streaming availability is unavailable', async () => {
  const fetcher = async (url) => {
    if (url.includes('firestore.googleapis.com')) return new Response('{}')
    if (url.endsWith('/watch/providers')) return new Response('{}', { status: 503 })
    return Response.json({ title: 'Arrival', release_date: '2016-11-10', genres: [{ name: 'Science Fiction' }] })
  }
  const response = await handleRequest(request('/movie/13'), env, fetcher)
  assert.equal((await response.json()).movie.streamingService, null)
})

test('invalid origins and unauthenticated requests never reach TMDB', async () => {
  let calls = 0
  const fetcher = async () => { calls++; return new Response('{}') }
  assert.equal((await handleRequest(request('/search?q=Arrival', 'https://evil.example'), env, fetcher)).status, 403)
  assert.equal((await handleRequest(new Request('https://movie-wheel-tmdb.example/search?q=Arrival'), env, fetcher)).status, 401)
  assert.equal((await handleRequest(request('/search?q=A'), env, fetcher)).status, 400)
  assert.equal(calls, 0)
})

test('a failed membership check never reaches TMDB', async () => {
  let calls = 0
  const response = await handleRequest(request('/search?q=Arrival'), env, async () => {
    calls++
    throw new Error('Firestore unavailable')
  })
  assert.equal(response.status, 503)
  assert.equal(calls, 1)
})

test('the deployed fetch handler does not treat Worker context as a fetch function', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url) => url.includes('firestore.googleapis.com')
    ? new Response('{}')
    : Response.json({ results: [] })
  try {
    const response = await worker.fetch(request('/search?q=Arrival'), env, { waitUntil() {} })
    assert.equal(response.status, 200)
  } finally {
    globalThis.fetch = originalFetch
  }
})
