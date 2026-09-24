import { useState, type FormEvent } from 'react'
import type { TmdbMovieDetails, TmdbSearchResult } from './tmdbTypes'

interface MovieSearchProps {
  searchMovies: (query: string) => Promise<TmdbSearchResult[]>
  loadMovie: (id: number) => Promise<TmdbMovieDetails>
  onSelect: (movie: TmdbMovieDetails) => void
}

export function MovieSearch({ searchMovies, loadMovie, onSelect }: MovieSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = query.trim()
    if (title.length < 2) {
      setError('Enter at least two characters to search.')
      return
    }
    setLoading(true)
    setResults(null)
    setError(null)
    try {
      setResults(await searchMovies(title))
    } catch {
      setError('Movie search is unavailable right now. You can still add the movie manually.')
    } finally {
      setLoading(false)
    }
  }

  async function choose(movie: TmdbSearchResult) {
    setSelectedId(movie.id)
    setError(null)
    try {
      onSelect(await loadMovie(movie.id))
      setResults(null)
      setQuery('')
    } catch {
      setError('Could not load that movie. Try another result or enter it manually.')
    } finally {
      setSelectedId(null)
    }
  }

  return (
    <section className="movie-search" aria-label="Search TMDB for a movie">
      <div className="movie-search-heading"><span>FIND A MOVIE</span><p>Search TMDB to fill in the details, then review them before adding.</p></div>
      <form className="movie-search-form" onSubmit={(event) => void submit(event)}>
        <label className="visually-hidden" htmlFor="tmdb-query">Movie title</label>
        <input id="tmdb-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a movie title" maxLength={100} disabled={loading || selectedId !== null} />
        <button type="submit" disabled={loading || selectedId !== null}>{loading ? 'SEARCHING…' : 'SEARCH'}</button>
      </form>
      {error && <p className="movie-search-error" role="alert">{error}</p>}
      {results && <div className="movie-search-results" role="region" aria-label="TMDB search results">
        {results.length === 0 ? <p>No movies found. Try another title or add it manually.</p> : results.map((movie) => (
          <div className="movie-search-result" key={movie.id}>
            {movie.posterPath ? <img src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`} alt="" loading="lazy" /> : <span className="movie-search-no-poster" aria-hidden="true">✦</span>}
            <div><strong>{movie.title}</strong><span>{movie.year ?? 'Year unknown'}</span>{movie.overview && <p>{movie.overview}</p>}</div>
            <button type="button" onClick={() => void choose(movie)} disabled={selectedId !== null}>{selectedId === movie.id ? 'LOADING…' : 'USE MOVIE'}</button>
          </div>
        ))}
      </div>}
    </section>
  )
}
