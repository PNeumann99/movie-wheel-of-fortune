import type { Movie } from './types'

export interface WheelSegment {
  movie: Movie
  startAngle: number
  sweepAngle: number
  chance: number
}

export function getWheelSegments(movies: Movie[]): WheelSegment[] {
  const totalWeight = movies.reduce((sum, movie) => sum + movie.weight, 0)
  if (totalWeight <= 0) return []

  let startAngle = 0
  return movies.map((movie) => {
    const chance = movie.weight / totalWeight
    const sweepAngle = chance * 360
    const segment = { movie, startAngle, sweepAngle, chance }
    startAngle += sweepAngle
    return segment
  })
}

export function pickWeightedMovie(movies: Movie[], random = Math.random): Movie | null {
  const totalWeight = movies.reduce((sum, movie) => sum + movie.weight, 0)
  if (totalWeight <= 0) return null

  let ticket = Math.min(Math.max(random(), 0), 1 - Number.EPSILON) * totalWeight
  for (const movie of movies) {
    ticket -= movie.weight
    if (ticket < 0) return movie
  }
  return movies[movies.length - 1] ?? null
}
