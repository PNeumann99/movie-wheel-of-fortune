import type { Movie } from './types'

export function lengthLabel(movie: Movie): string {
  if (movie.kind === 'series') return 'Series'
  if (!movie.runtimeMinutes) return 'Length unknown'
  const hours = Math.floor(movie.runtimeMinutes / 60)
  const minutes = movie.runtimeMinutes % 60
  return `${hours ? `${hours}h` : ''}${hours && minutes ? ' ' : ''}${minutes ? `${minutes}m` : ''}`
}

export function addedDate(createdAt: number): Date | null {
  // Early preview entries used small ordering numbers instead of timestamps.
  return Number.isFinite(createdAt) && createdAt >= Date.UTC(2001, 0, 1)
    && createdAt <= 8.64e15 ? new Date(createdAt) : null
}
