export type MovieStatus = 'backlog' | 'watched'
export type MovieKind = 'movie' | 'series'

export const genres = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror',
  'Music', 'Musical', 'Mystery', 'Romance', 'Science Fiction', 'Sport',
  'Thriller', 'War', 'Western', 'Other',
] as const

export const streamingServices = ['Netflix', 'Amazon Prime Video', 'Disney+'] as const

export type MovieGenre = typeof genres[number]
export type StreamingService = typeof streamingServices[number]

export interface Movie {
  id: string
  title: string
  year: number | null
  weight: number
  status: MovieStatus
  createdAt: number
  addedBy: string
  addedByName?: string // Older movies do not have this snapshot.
  genre?: MovieGenre // Older movies predate the genre field.
  streamingService?: StreamingService | null
  kind?: MovieKind // Older entries are movies.
  runtimeMinutes?: number | null // Older entries may not have a runtime.
}

export type MovieDetails = Pick<Movie, 'title' | 'year' | 'weight'> & {
  kind: MovieKind
  runtimeMinutes: number | null
  genre: MovieGenre
  streamingService: StreamingService | null
}
