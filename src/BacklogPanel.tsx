import { useState, type ReactNode } from 'react'
import { MoviePoster } from './MoviePoster'
import { addedDate, lengthLabel } from './moviePresentation'
import type { Movie } from './types'

interface BacklogPanelProps {
  movies: Movie[]
  disabled?: boolean
  authorName: (movie: Movie) => string
  onAdd: () => void
  onEdit: (movie: Movie) => void
  onWatched: (movie: Movie) => void
  onRemove: (movie: Movie, trigger: HTMLButtonElement) => void
  children?: ReactNode
}

function BacklogCard({ movie, authorName, onEdit, onWatched, onRemove, disabled }: Omit<BacklogPanelProps, 'movies' | 'onAdd' | 'children'> & { movie: Movie }) {
  const [expanded, setExpanded] = useState(false)
  const date = addedDate(movie.createdAt)
  const overview = movie.overview?.trim()
  const longOverview = overview && overview.length > 220

  return (
    <article className="backlog-card">
      <MoviePoster path={movie.posterPath} />
      <div className="backlog-card-heading">
        <span className="eyebrow">{movie.kind === 'series' ? 'SERIES' : 'MOVIE'}</span>
        <h3>{movie.title}</h3>
        <div className="backlog-tags"><span>{movie.year ?? 'Year unknown'}</span><span>{movie.genre ?? 'Genre not set'}</span>{movie.kind !== 'series' && <span>{lengthLabel(movie)}</span>}</div>
        <p className="backlog-service">{movie.streamingService ?? 'Streaming service not set'}</p>
        <span className="backlog-weight">Wheel weight <strong>{movie.weight}</strong></span>
      </div>
      <div className="backlog-description">
        <p>{overview ? longOverview && !expanded ? `${overview.slice(0, 220).trimEnd()}…` : overview : movie.kind === 'series' ? 'No description yet. Edit this entry to add one.' : 'No description yet. Edit this entry to add one or find its details on TMDB.'}</p>
        {longOverview && <button type="button" aria-expanded={expanded} aria-label={`${expanded ? 'Show less' : 'Read more'} about ${movie.title}`} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show less' : 'Read more'}</button>}
      </div>
      <div className="backlog-added"><span>Added by <strong>{authorName(movie)}</strong></span>{date ? <time dateTime={date.toISOString()}>{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time> : <span>Date added unknown</span>}</div>
      <div className="backlog-actions">
        <button type="button" className="backlog-watched" disabled={disabled} onClick={() => onWatched(movie)} aria-label={`Mark ${movie.title} watched`}>Mark watched</button>
        <button type="button" disabled={disabled} onClick={() => onEdit(movie)} aria-label={`Edit ${movie.title}`}>Edit</button>
        <button type="button" className="backlog-remove" disabled={disabled} onClick={(event) => onRemove(movie, event.currentTarget)} aria-label={`Remove ${movie.title}`}>Remove</button>
      </div>
    </article>
  )
}

export function BacklogPanel({ movies, onAdd, children, ...actions }: BacklogPanelProps) {
  return (
    <section className="backlog-section" aria-labelledby="backlog-heading">
      <div className="backlog-heading"><div><span className="eyebrow">SAVED FOR A MOVIE NIGHT</span><h2 id="backlog-heading" tabIndex={-1}>The backlog <span>{movies.length}</span></h2><p>Your full list, newest additions first.</p></div><button className="primary-button" type="button" disabled={actions.disabled} onClick={onAdd}>+ Add a title</button></div>
      {children}
      {movies.length === 0 ? <div className="backlog-empty"><span aria-hidden="true">✦</span><h3>Your next movie night starts here</h3><p>Add a movie or series to give the wheel its first pick.</p></div> : <div className="backlog-grid">{movies.map((movie) => <BacklogCard key={movie.id} movie={movie} {...actions} />)}</div>}
    </section>
  )
}
