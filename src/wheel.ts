import type { Movie } from './types'

export const COOLDOWN_SPINS = 3
export const COOLDOWN_WEIGHT_MULTIPLIER = 0.25

export type SpinCooldowns = Record<string, number>

export function withSpinCooldowns(movies: Movie[], cooldowns: SpinCooldowns): Movie[] {
  return movies.map((movie) => cooldowns[movie.id] > 0
    ? { ...movie, weight: movie.weight * COOLDOWN_WEIGHT_MULTIPLIER }
    : movie)
}

export function advanceSpinCooldowns(cooldowns: SpinCooldowns): SpinCooldowns {
  return Object.fromEntries(Object.entries(cooldowns)
    .filter(([, remaining]) => remaining > 1)
    .map(([id, remaining]) => [id, remaining - 1]))
}

export function coolDownMovie(cooldowns: SpinCooldowns, id: string): SpinCooldowns {
  return { ...cooldowns, [id]: COOLDOWN_SPINS }
}

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
