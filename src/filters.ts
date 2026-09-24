import type { Movie, MovieGenre } from './types'

export interface MovieFilters {
  excludedGenres: readonly MovieGenre[]
  minYear: number | null
  maxYear: number | null
  addedBy: string | null
}

export function filterMovies(movies: readonly Movie[], filters: MovieFilters): Movie[] {
  const excluded = new Set(filters.excludedGenres)
  return movies.filter((movie) =>
    movie.status === 'backlog'
    && (!movie.genre || !excluded.has(movie.genre))
    && (filters.minYear === null || (movie.year !== null && movie.year >= filters.minYear))
    && (filters.maxYear === null || (movie.year !== null && movie.year <= filters.maxYear))
    && (filters.addedBy === null || movie.addedBy === filters.addedBy)
  )
}
