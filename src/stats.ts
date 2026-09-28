import type { Movie, MovieGenre } from './types'

const DAY_MS = 24 * 60 * 60 * 1000
const EARLIEST_VALID_ADDED_AT = Date.UTC(2001, 0, 1)

export interface MovieStats {
  watchedCount: number
  watchedMovies: number
  watchedSeries: number
  topGenres: MovieGenre[]
  topGenreCount: number
  watchedRuntimeMinutes: number
  runtimeMovieCount: number
  averageReleaseYear: number | null
  releaseYearCount: number
  oldestBacklog: { movie: Movie; daysWaiting: number } | null
}

export function getMovieStats(movies: readonly Movie[], now = Date.now()): MovieStats {
  const watched = movies.filter((movie) => movie.status === 'watched')
  const watchedMovies = watched.filter((movie) => movie.kind !== 'series')
  const runtimeMovies = watchedMovies.filter((movie) => Number.isFinite(movie.runtimeMinutes) && (movie.runtimeMinutes ?? 0) > 0)
  const datedTitles = watched.filter((movie) => Number.isInteger(movie.year) && movie.year! >= 1888 && movie.year! <= 2100)
  const genreCounts = new Map<MovieGenre, number>()

  for (const movie of watched) {
    if (movie.genre) genreCounts.set(movie.genre, (genreCounts.get(movie.genre) ?? 0) + 1)
  }

  const topGenreCount = Math.max(0, ...genreCounts.values())
  const topGenres = [...genreCounts]
    .filter(([, count]) => count === topGenreCount)
    .map(([genre]) => genre)
    .sort((a, b) => a.localeCompare(b))

  const oldestMovie = movies
    .filter((movie) => movie.status === 'backlog' && Number.isFinite(movie.createdAt)
      && movie.createdAt >= EARLIEST_VALID_ADDED_AT && movie.createdAt <= now)
    .reduce<Movie | null>((oldest, movie) => !oldest || movie.createdAt < oldest.createdAt ? movie : oldest, null)

  return {
    watchedCount: watched.length,
    watchedMovies: watchedMovies.length,
    watchedSeries: watched.length - watchedMovies.length,
    topGenres,
    topGenreCount,
    watchedRuntimeMinutes: runtimeMovies.reduce((total, movie) => total + movie.runtimeMinutes!, 0),
    runtimeMovieCount: runtimeMovies.length,
    averageReleaseYear: datedTitles.length
      ? Math.round(datedTitles.reduce((total, movie) => total + movie.year!, 0) / datedTitles.length)
      : null,
    releaseYearCount: datedTitles.length,
    oldestBacklog: oldestMovie
      ? { movie: oldestMovie, daysWaiting: Math.floor((now - oldestMovie.createdAt) / DAY_MS) }
      : null,
  }
}
