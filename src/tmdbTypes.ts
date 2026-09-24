import type { MovieGenre, StreamingService } from './types'

export interface TmdbSearchResult {
  id: number
  title: string
  year: number | null
  overview: string
  posterPath: string | null
}

export interface TmdbMovieDetails {
  title: string
  year: number | null
  genre: MovieGenre
  streamingService: StreamingService | null
}
