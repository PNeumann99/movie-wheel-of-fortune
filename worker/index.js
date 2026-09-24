import { tmdbMovieDetails, tmdbSearchResults } from '../src/tmdbData.ts'

const tmdbBase = 'https://api.themoviedb.org/3'

function decodedUserId(token, projectId) {
  try {
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      (character) => character.charCodeAt(0),
    )))
    if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`
      || typeof payload.sub !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(payload.sub)) return null
    return payload.sub
  } catch {
    return null
  }
}

function reply(status, body, origin) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' }
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  return new Response(JSON.stringify(body), { status, headers })
}

async function tmdbGet(path, token, fetcher) {
  const response = await fetcher(`${tmdbBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`TMDB returned ${response.status}`)
  return response.json()
}

export async function handleRequest(request, env, fetcher = fetch) {
  const origin = request.headers.get('Origin')
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim())
  if (origin && !allowedOrigins.includes(origin)) return reply(403, { error: 'Origin not allowed.' }, null)

  if (request.method === 'OPTIONS') {
    if (!origin) return reply(400, { error: 'Missing origin.' }, null)
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization',
        'Access-Control-Max-Age': '3600',
        Vary: 'Origin',
      },
    })
  }

  if (request.method !== 'GET') return reply(405, { error: 'Method not allowed.' }, origin)
  const url = new URL(request.url)
  const movieMatch = /^\/movie\/([1-9]\d{0,9})$/.exec(url.pathname)
  const isSearch = url.pathname === '/search'
  if (!isSearch && !movieMatch) return reply(404, { error: 'Not found.' }, origin)

  const query = url.searchParams.get('q')?.trim() ?? ''
  if (isSearch && (query.length < 2 || query.length > 100)) return reply(400, { error: 'Search for 2 to 100 characters.' }, origin)
  if (!env.FIREBASE_PROJECT_ID || !env.TMDB_READ_ACCESS_TOKEN) return reply(503, { error: 'Movie search is not configured.' }, origin)

  const bearer = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') ?? '')?.[1]
  const userId = bearer && decodedUserId(bearer, env.FIREBASE_PROJECT_ID)
  if (!userId) return reply(401, { error: 'Sign in to search movies.' }, origin)

  let membership
  try {
    // Firestore verifies the Firebase ID token and applies the member document rule.
    membership = await fetcher(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/members/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${bearer}` },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return reply(503, { error: 'Could not check group membership.' }, origin)
  }
  if (membership.status === 401) return reply(401, { error: 'Sign in again to search movies.' }, origin)
  if (membership.status === 403 || membership.status === 404) return reply(403, { error: 'Only group members can search movies.' }, origin)
  if (!membership.ok) return reply(503, { error: 'Could not check group membership.' }, origin)

  try {
    if (isSearch) {
      const data = await tmdbGet(`/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`, env.TMDB_READ_ACCESS_TOKEN, fetcher)
      return reply(200, { results: tmdbSearchResults(data) }, origin)
    }

    const movieId = movieMatch[1]
    const [details, providers] = await Promise.all([
      tmdbGet(`/movie/${movieId}?language=en-US`, env.TMDB_READ_ACCESS_TOKEN, fetcher),
      tmdbGet(`/movie/${movieId}/watch/providers`, env.TMDB_READ_ACCESS_TOKEN, fetcher).catch(() => null),
    ])
    return reply(200, { movie: tmdbMovieDetails(details, providers) }, origin)
  } catch {
    return reply(502, { error: 'TMDB is unavailable. Try again later.' }, origin)
  }
}

export default { fetch: handleRequest }
