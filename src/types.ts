export type MovieStatus = 'backlog' | 'watched'

export interface Movie {
  id: string
  title: string
  year: number | null
  weight: number
  status: MovieStatus
  createdAt: number
  addedBy: string
}

export type MovieDetails = Pick<Movie, 'title' | 'year' | 'weight'>
