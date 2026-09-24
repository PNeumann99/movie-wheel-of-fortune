export type MovieStatus = 'backlog' | 'watched'

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
}

export type MovieDetails = Pick<Movie, 'title' | 'year' | 'weight'> & {
  genre: MovieGenre
  streamingService: StreamingService | null
}
