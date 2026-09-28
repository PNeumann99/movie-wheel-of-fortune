import type { MovieGenre, StreamingService } from './types'

export interface TmdbSearchResult {
  id: number
  title: string
  year: number | null
  overview: string
  posterPath: string | null
}

export interface TmdbMovieDetails {
  tmdbId: number | null
  posterPath: string | null
  overview: string
  title: string
  year: number | null
  runtimeMinutes: number | null
  genre: MovieGenre
  streamingService: StreamingService | null
}
