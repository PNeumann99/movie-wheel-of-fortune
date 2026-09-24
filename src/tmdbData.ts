import { genres, type MovieGenre, type StreamingService } from './types.ts'
import type { TmdbMovieDetails, TmdbSearchResult } from './tmdbTypes.ts'

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null
}

function releaseYear(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const year = Number(value.slice(0, 4))
  return year >= 1888 && year <= 2100 ? year : null
}

function posterPath(value: unknown): string | null {
  return typeof value === 'string' && /^\/[\w-]+\.(?:jpg|jpeg|png|webp)$/.test(value) ? value : null
}

export function tmdbSearchResults(response: unknown): TmdbSearchResult[] {
  const raw = object(response)?.results
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const movie = object(item)
    if (!movie || !Number.isInteger(movie.id) || (movie.id as number) < 1 || typeof movie.title !== 'string' || !movie.title.trim()) return []
    return [{
      id: movie.id as number,
      title: movie.title.trim().slice(0, 120),
      year: releaseYear(movie.release_date),
      overview: typeof movie.overview === 'string' ? movie.overview.trim().slice(0, 350) : '',
      posterPath: posterPath(movie.poster_path),
    }]
  }).slice(0, 10)
}

function movieGenre(details: Record<string, unknown>): MovieGenre {
  const rawGenres = details.genres
  if (!Array.isArray(rawGenres)) return 'Other'
  for (const item of rawGenres) {
    const name = object(item)?.name
    if (typeof name === 'string' && (genres as readonly string[]).includes(name)) return name as MovieGenre
  }
  return 'Other'
}

function germanStreamingService(providersResponse: unknown): StreamingService | null {
  const germany = object(object(providersResponse)?.results)?.DE
  const streaming = object(germany)?.flatrate
  if (!Array.isArray(streaming)) return null
  const providerIds = new Set(streaming.map((item) => object(item)?.provider_id))
  if (providerIds.has(8) || providerIds.has(1796)) return 'Netflix'
  if (providerIds.has(9) || providerIds.has(119)) return 'Amazon Prime Video'
  if (providerIds.has(337) || providerIds.has(2739)) return 'Disney+'
  return null
}

export function tmdbMovieDetails(detailsResponse: unknown, providersResponse: unknown): TmdbMovieDetails {
  const details = object(detailsResponse)
  if (!details || typeof details.title !== 'string' || !details.title.trim()) {
    throw new Error('TMDB did not return a movie title.')
  }
  return {
    title: details.title.trim().slice(0, 120),
    year: releaseYear(details.release_date),
    genre: movieGenre(details),
    streamingService: germanStreamingService(providersResponse),
  }
}
