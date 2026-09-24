import { auth, isFirebaseConfigured } from './firebase'
import type { TmdbMovieDetails, TmdbSearchResult } from './tmdbTypes'

const workerUrl = import.meta.env.VITE_TMDB_WORKER_URL?.trim().replace(/\/$/, '')
export const isTmdbConfigured = isFirebaseConfigured && Boolean(workerUrl)

async function requestTmdb<T>(path: string): Promise<T> {
  if (!workerUrl || !auth?.currentUser) throw new Error('Sign in to search movies.')
  const response = await fetch(`${workerUrl}${path}`, {
    headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` },
  })
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Movie search is unavailable.')
  return data
}

export async function searchTmdbMovies(query: string): Promise<TmdbSearchResult[]> {
  const data = await requestTmdb<{ results: TmdbSearchResult[] }>(`/search?q=${encodeURIComponent(query)}`)
  return data.results
}

export async function loadTmdbMovie(id: number): Promise<TmdbMovieDetails> {
  const data = await requestTmdb<{ movie: TmdbMovieDetails }>(`/movie/${id}`)
  return data.movie
}
