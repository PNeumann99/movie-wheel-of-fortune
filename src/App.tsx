import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { getWheelSegments, pickWeightedMovie, type WheelSegment } from './wheel'
import { filterMovies } from './filters'
import { useMovieStore } from './useMovieStore'
import { MovieSearch } from './MovieSearch'
import { RemoveMovieDialog } from './RemoveMovieDialog'
import { isTmdbConfigured, loadTmdbMovie, searchTmdbMovies } from './tmdbApi'
import type { TmdbMovieDetails } from './tmdbTypes'
import { genres, streamingServices, type Movie, type MovieDetails, type MovieGenre, type MovieKind, type StreamingService } from './types'
import './App.css'

const colors = ['#f8b85e', '#dd7969', '#9d93dc', '#69b9a7', '#e6a0bd', '#89a9d8', '#d5bd7d', '#8dc5c1']

function lengthLabel(movie: Movie): string {
  if (movie.kind === 'series') return 'Series'
  if (!movie.runtimeMinutes) return 'Length unknown'
  const hours = Math.floor(movie.runtimeMinutes / 60)
  const minutes = movie.runtimeMinutes % 60
  return `${hours ? `${hours}h` : ''}${hours && minutes ? ' ' : ''}${minutes ? `${minutes}m` : ''}`
}

function point(angle: number, radius: number) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: 250 + Math.cos(radians) * radius, y: 250 + Math.sin(radians) * radius }
}

function slicePath(segment: WheelSegment) {
  const start = point(segment.startAngle, 220)
  const end = point(segment.startAngle + segment.sweepAngle, 220)
  return `M 250 250 L ${start.x} ${start.y} A 220 220 0 ${segment.sweepAngle > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`
}

function Wheel({ movies, rotation, spinning, hasBacklog }: { movies: Movie[], rotation: number, spinning: boolean, hasBacklog: boolean }) {
  const segments = getWheelSegments(movies)

  return (
    <div className={`wheel-wrap ${spinning ? 'is-spinning' : ''}`}>
      <div className="wheel-pointer" aria-hidden="true" />
      <svg className="wheel" viewBox="0 0 500 500" role="img" aria-label={movies.length ? 'Watchlist selection wheel' : hasBacklog ? 'No entries match the current filters' : 'Empty watchlist wheel'} style={{ transform: `rotate(${rotation}deg)` }}>
        <circle cx="250" cy="250" r="235" fill="#20243b" />
        {segments.length === 0 && (
          <>
            <circle cx="250" cy="250" r="218" fill="#31364e" />
            <circle cx="250" cy="250" r="184" className="empty-wheel-ring" />
            <text x="250" y="216" className="empty-wheel-spark">✦</text>
            <text x="250" y="258" className="empty-wheel-text">{hasBacklog ? 'NO ENTRIES MATCH' : 'NOTHING TO WATCH YET'}</text>
            <text x="250" y="290" className="empty-wheel-subtext">{hasBacklog ? 'Adjust tonight’s filters' : 'Add one to get started'}</text>
          </>
        )}
        {segments.map((segment, index) => {
          const mid = segment.startAngle + segment.sweepAngle / 2
          const labelPoint = point(mid, 135)
          const title = segment.movie.title.length > 17 ? `${segment.movie.title.slice(0, 15)}…` : segment.movie.title
          return (
            <g key={segment.movie.id}>
              {segment.sweepAngle >= 359.99
                ? <circle cx="250" cy="250" r="220" fill={colors[index % colors.length]} />
                : <path d={slicePath(segment)} fill={colors[index % colors.length]} stroke="#20243b" strokeWidth="3" />}
              {segment.sweepAngle >= 17 && (
                <text x={labelPoint.x} y={labelPoint.y} className="slice-label" textAnchor="middle" dominantBaseline="middle">
                  {title}
                </text>
              )}
            </g>
          )
        })}
        {segments.length > 0 && (
          <>
            <circle cx="250" cy="250" r="39" fill="#20243b" stroke="#fff4df" strokeWidth="5" />
            <circle cx="250" cy="250" r="12" fill="#f8b85e" />
          </>
        )}
      </svg>
    </div>
  )
}

function App() {
  const store = useMovieStore()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<MovieKind>('movie')
  const [year, setYear] = useState('')
  const [runtimeMinutes, setRuntimeMinutes] = useState('')
  const [weight, setWeight] = useState(1)
  const [genre, setGenre] = useState<MovieGenre | ''>('')
  const [streamingService, setStreamingService] = useState<StreamingService | ''>('')
  const [excludedGenres, setExcludedGenres] = useState<MovieGenre[]>([])
  const [minYear, setMinYear] = useState('')
  const [maxYear, setMaxYear] = useState('')
  const [addedByFilter, setAddedByFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [spinMovies, setSpinMovies] = useState<Movie[] | null>(null)
  const [winner, setWinner] = useState<Movie | null>(null)
  const [movieToRemove, setMovieToRemove] = useState<Movie | null>(null)
  const [removingMovie, setRemovingMovie] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const removeTrigger = useRef<HTMLButtonElement | null>(null)
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const backlog = useMemo(() => store.movies.filter((movie) => movie.status === 'backlog'), [store.movies])
  const watched = useMemo(() => store.movies.filter((movie) => movie.status === 'watched'), [store.movies])
  const genreChoices = useMemo(() => genres.filter((option) => backlog.some((movie) => movie.genre === option)), [backlog])
  const activeExcludedGenres = useMemo(() => excludedGenres.filter((option) => genreChoices.includes(option)), [excludedGenres, genreChoices])
  const lowerYear = minYear === '' ? null : Number(minYear)
  const upperYear = maxYear === '' ? null : Number(maxYear)
  const invalidYearRange = (lowerYear !== null && (!Number.isInteger(lowerYear) || lowerYear < 1888 || lowerYear > 2100))
    || (upperYear !== null && (!Number.isInteger(upperYear) || upperYear < 1888 || upperYear > 2100))
    || (lowerYear !== null && upperYear !== null && lowerYear > upperYear)
  const eligible = useMemo(() => invalidYearRange ? [] : filterMovies(backlog, {
    excludedGenres: activeExcludedGenres,
    minYear: lowerYear,
    maxYear: upperYear,
    addedBy: addedByFilter || null,
  }), [backlog, activeExcludedGenres, lowerYear, upperYear, addedByFilter, invalidYearRange])
  const segments = useMemo(() => getWheelSegments(eligible), [eligible])
  const chanceById = useMemo(() => new Map(segments.map((segment) => [segment.movie.id, segment.chance])), [segments])
  const hasFilters = activeExcludedGenres.length > 0 || minYear !== '' || maxYear !== '' || addedByFilter !== ''
  const contributorIds = [...new Set([...backlog.map((movie) => movie.addedBy), ...(addedByFilter ? [addedByFilter] : [])])]
  const editingMovie = store.movies.find((movie) => movie.id === editingId)

  function authorName(movie: Movie) {
    return store.memberNames[movie.addedBy]
      || movie.addedByName
      || (movie.addedBy === store.user?.uid ? store.user.displayName || store.user.email : null)
      || (movie.addedBy === 'preview' ? 'Preview user' : `Member ${movie.addedBy.slice(0, 6)}`)
  }

  function contributorName(id: string) {
    const movie = store.movies.find((entry) => entry.addedBy === id)
    return movie ? authorName(movie) : store.memberNames[id] || `Member ${id.slice(0, 6)}`
  }

  const formAuthor = editingMovie
    ? authorName(editingMovie)
    : store.preview ? 'Preview user' : store.memberNames[store.user?.uid ?? ''] || store.user?.displayName || store.user?.email || store.user?.uid || 'Member'

  function toggleGenre(option: MovieGenre) {
    setExcludedGenres((current) => current.includes(option) ? current.filter((genre) => genre !== option) : [...current, option])
  }

  function clearFilters() {
    setExcludedGenres([])
    setMinYear('')
    setMaxYear('')
    setAddedByFilter('')
  }

  function useTmdbMovie(movie: TmdbMovieDetails) {
    setTitle(movie.title)
    setKind('movie')
    setYear(movie.year?.toString() ?? '')
    setRuntimeMinutes(movie.runtimeMinutes?.toString() ?? '')
    setWeight(1)
    setGenre(movie.genre)
    setStreamingService(movie.streamingService ?? '')
    setEditingId(null)
    setError(null)
    document.querySelector('#movie-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  useEffect(() => () => { if (spinTimer.current) clearTimeout(spinTimer.current) }, [])

  function resetForm() {
    setTitle('')
    setKind('movie')
    setYear('')
    setRuntimeMinutes('')
    setWeight(1)
    setGenre('')
    setStreamingService('')
    setEditingId(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    const parsedYear = year.trim() ? Number(year) : null
    const parsedRuntime = kind === 'movie' && runtimeMinutes.trim() ? Number(runtimeMinutes) : null
    if (!cleanTitle) return setError(`Add a ${kind} title first.`)
    if (cleanTitle.length > 120) return setError('Keep the title under 120 characters.')
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1888 || parsedYear > 2100)) return setError('Enter a valid release year.')
    if (parsedRuntime !== null && (!Number.isInteger(parsedRuntime) || parsedRuntime < 1 || parsedRuntime > 1440)) return setError('Enter a length from 1 to 1440 minutes.')
    if (!Number.isInteger(weight) || weight < 1 || weight > 10) return setError('Choose a weight between 1 and 10.')
    if (!genre) return setError('Choose a genre.')

    const details: MovieDetails = { title: cleanTitle, kind, year: parsedYear, runtimeMinutes: parsedRuntime, weight, genre, streamingService: streamingService || null }
    setBusy(true)
    setError(null)
    try {
      if (editingId) await store.updateMovie(editingId, details)
      else await store.addMovie(details)
      resetForm()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the movie.')
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(movie: Movie) {
    setError(null)
    try {
      await store.updateMovie(movie.id, { status: movie.status === 'watched' ? 'backlog' : 'watched' })
      if (winner?.id === movie.id) closeResult()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the movie.')
    }
  }

  function askToRemove(movie: Movie, trigger: HTMLButtonElement) {
    removeTrigger.current = trigger
    setRemoveError(null)
    setMovieToRemove(movie)
  }

  function closeRemoveDialog() {
    const trigger = removeTrigger.current
    const heading = movieToRemove?.status === 'watched' ? '.watched-section h2' : '.list-heading h2'
    setMovieToRemove(null)
    setRemoveError(null)
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus()
      else (document.querySelector<HTMLElement>(heading) ?? document.querySelector<HTMLElement>('.list-heading h2'))?.focus()
    })
  }

  async function confirmRemoveMovie() {
    const movie = movieToRemove
    if (!movie || removingMovie) return
    setRemovingMovie(true)
    setRemoveError(null)
    try {
      await store.removeMovie(movie.id)
      if (editingId === movie.id) resetForm()
      if (winner?.id === movie.id) closeResult()
      closeRemoveDialog()
    } catch (cause) {
      setRemoveError(cause instanceof Error ? cause.message : 'Could not remove the movie.')
    } finally {
      setRemovingMovie(false)
    }
  }

  function startEdit(movie: Movie) {
    setTitle(movie.title)
    setKind(movie.kind ?? 'movie')
    setYear(movie.year?.toString() ?? '')
    setRuntimeMinutes(movie.kind === 'series' ? '' : movie.runtimeMinutes?.toString() ?? '')
    setWeight(movie.weight)
    setGenre(movie.genre ?? '')
    setStreamingService(movie.streamingService ?? '')
    setEditingId(movie.id)
    document.querySelector('#movie-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function closeResult() {
    setWinner(null)
    setSpinMovies(null)
  }

  function spin() {
    if (spinning || eligible.length === 0) return
    const selected = pickWeightedMovie(eligible)
    if (!selected) return
    const segment = segments.find((item) => item.movie.id === selected.id)
    if (!segment) return

    const center = segment.startAngle + segment.sweepAngle / 2
    const current = ((rotation % 360) + 360) % 360
    const alignment = (((-center - current) % 360) + 360) % 360
    setWinner(null)
    setSpinMovies(eligible)
    setSpinning(true)
    setRotation(rotation + 360 * 6 + alignment)
    spinTimer.current = setTimeout(() => {
      setSpinning(false)
      setWinner(selected)
    }, 4600)
  }

  const canUseApp = store.preview || (store.user && store.isMember)

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">✦</span><span>MOVIE NIGHT<span className="brand-dot">.</span></span></div>
        <div className="header-actions">
          {store.preview && <span className="preview-pill">LOCAL PREVIEW</span>}
          {store.user && <><span className="user-name">{store.user.displayName || store.user.email}</span><button className="text-button" onClick={() => void store.logOut()}>Sign out</button></>}
        </div>
      </header>

      {store.preview && <div className="preview-banner">Preview mode: movies are saved only in this browser. Add Firebase settings to share the list with friends.</div>}

      {!canUseApp ? (
        <main className="access-screen">
          <div className="eyebrow">THE SHARED MOVIE BACKLOG</div>
          <h1>Less debating.<br /><em>More watching.</em></h1>
          {store.authLoading || store.membershipLoading ? <p>Getting your movie night ready…</p> : !store.user ? (
            <>
              <p>Sign in to add movies, set the odds, and let the wheel choose.</p>
              <button className="primary-button" onClick={() => void store.signIn().catch((cause) => setError(cause.message))}>Continue with Google <span>↗</span></button>
            </>
          ) : (
            <div className="access-card">
              <h2>You’re signed in</h2>
              <p>Your account needs to be added to the group. Share this user ID with the group owner:</p>
              <code>{store.user.uid}</code>
              <button className="secondary-button" onClick={() => void navigator.clipboard.writeText(store.user!.uid)}>Copy user ID</button>
            </div>
          )}
          {(error || store.dataError) && <p className="error-message" role="alert">{error || store.dataError}</p>}
        </main>
      ) : (
        <main>
          <section className="intro">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> MOVIE NIGHT, SORTED</div>
              <h1>Pick a movie.<br /><em>Leave it to chance.</em></h1>
              <p>A shared list of movies and series you want to see. Give your favorites a little extra luck, then spin to decide what’s on tonight.</p>
            </div>
            <div className="intro-count"><strong>{eligible.length}</strong><span>PICKS IN THE MIX</span></div>
          </section>

          <section className="filter-card" aria-label="Tonight’s wheel filters">
            <div className="filter-heading">
              <div><span className="eyebrow">SET THE MOOD</span><h2>Tonight’s filters</h2><p>Choose what can land on the wheel. Every entry stays in your watchlist.</p></div>
              <button type="button" className="clear-filters" onClick={clearFilters} disabled={!hasFilters || spinning}>Clear filters</button>
            </div>
            <div className="filter-controls">
              <fieldset className="genre-filter" disabled={spinning}>
                <legend>SKIP GENRES</legend>
                <div className="genre-options">
                  {genreChoices.length === 0 ? <span className="filter-placeholder">Add movies to see genres here.</span> : genreChoices.map((option) => (
                    <label key={option} className={`genre-option ${excludedGenres.includes(option) ? 'is-excluded' : ''}`}>
                      <input type="checkbox" checked={excludedGenres.includes(option)} onChange={() => toggleGenre(option)} />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="filter-side">
                <div className="year-filter"><label>RELEASE YEAR</label><div className="year-inputs"><input aria-label="From year" type="number" min="1888" max="2100" step="1" placeholder="From" value={minYear} onChange={(event) => setMinYear(event.target.value)} disabled={spinning} /><span>to</span><input aria-label="To year" type="number" min="1888" max="2100" step="1" placeholder="To" value={maxYear} onChange={(event) => setMaxYear(event.target.value)} disabled={spinning} /></div></div>
                <div className="contributor-filter"><label htmlFor="filter-added-by">ADDED BY</label><select id="filter-added-by" value={addedByFilter} onChange={(event) => setAddedByFilter(event.target.value)} disabled={spinning}><option value="">Anyone</option>{contributorIds.map((id) => <option key={id} value={id}>{contributorName(id)}</option>)}</select></div>
              </div>
            </div>
            <p className={`filter-feedback ${invalidYearRange ? 'is-invalid' : ''}`} role="status">{invalidYearRange ? 'Enter years from 1888 to 2100, with “from” no later than “to”.' : `${eligible.length} of ${backlog.length} backlog ${backlog.length === 1 ? 'entry' : 'entries'} in tonight’s mix${hasFilters && eligible.length === 0 && backlog.length > 0 ? ' — adjust or clear filters to spin' : ''}.`}</p>
          </section>

          <div className="dashboard">
            <section className="wheel-card" aria-label="Spin the movie wheel">
              <div className="card-topline"><span>01 / THE DECIDER</span><span className="tiny-star">✦</span></div>
              <Wheel movies={spinMovies ?? eligible} rotation={rotation} spinning={spinning} hasBacklog={backlog.length > 0} />
              <div className="wheel-actions">
                <button className="spin-button" onClick={spin} disabled={spinning || eligible.length === 0}>{spinning ? 'SPINNING…' : 'SPIN THE WHEEL'} <span>↗</span></button>
                <p>More weight means a bigger slice and a better chance.</p>
              </div>
            </section>

            <section className="list-card">
              <div className="card-topline"><span>02 / THE BACKLOG</span><span>{backlog.length} PICKS</span></div>
              <div className="list-heading"><h2 tabIndex={-1}>The watchlist</h2><p>Every great movie night starts somewhere.</p></div>
              <div className="kind-picker" role="group" aria-label="Watchlist entry type">
                <span>ADD A</span>
                <button type="button" aria-pressed={kind === 'movie'} onClick={() => setKind('movie')}>Movie</button>
                <button type="button" aria-pressed={kind === 'series'} onClick={() => { setKind('series'); setRuntimeMinutes('') }}>Series</button>
              </div>
              {kind === 'movie' && isTmdbConfigured && <MovieSearch searchMovies={searchTmdbMovies} loadMovie={loadTmdbMovie} onSelect={useTmdbMovie} />}
              {kind === 'movie' && !store.preview && !isTmdbConfigured && <p className="movie-search-unavailable">TMDB search is not configured yet. You can still add movies manually.</p>}
              {kind === 'series' && <p className="series-hint">Add series manually. TMDB search is available for movies.</p>}
              <form id="movie-form" className="movie-form" onSubmit={(event) => void handleSubmit(event)}>
                <label htmlFor="movie-title">{kind === 'series' ? 'SERIES TITLE' : 'MOVIE TITLE'}</label>
                <input id="movie-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={kind === 'series' ? 'e.g. The Bear' : 'e.g. Everything Everywhere All at Once'} maxLength={120} />
                <div className="form-row">
                  <div><label htmlFor="movie-year">YEAR <span>(OPTIONAL)</span></label><input id="movie-year" type="number" min="1888" max="2100" value={year} onChange={(event) => setYear(event.target.value)} placeholder="2022" /></div>
                  <div><label htmlFor="movie-weight">WEIGHT <span>(1–10)</span></label><input id="movie-weight" type="number" min="1" max="10" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></div>
                </div>
                {kind === 'movie' && <div className="runtime-field"><label htmlFor="movie-runtime">LENGTH IN MINUTES <span>(OPTIONAL)</span></label><input id="movie-runtime" type="number" min="1" max="1440" step="1" inputMode="numeric" value={runtimeMinutes} onChange={(event) => setRuntimeMinutes(event.target.value)} placeholder="e.g. 116" /></div>}
                <div className="form-row details-row">
                  <div><label htmlFor="movie-genre">GENRE <span>(REQUIRED)</span></label><select id="movie-genre" value={genre} onChange={(event) => setGenre(event.target.value as MovieGenre | '')} required><option value="">Choose a genre</option>{genres.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                  <div><label htmlFor="movie-streaming">STREAMING SERVICE <span>(OPTIONAL)</span></label><select id="movie-streaming" value={streamingService} onChange={(event) => setStreamingService(event.target.value as StreamingService | '')}><option value="">Not specified</option>{streamingServices.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                </div>
                <div className="form-author"><span>ADDED BY</span><strong>{formAuthor}</strong><small>{editingMovie ? 'Original contributor' : store.preview ? 'Local preview' : 'From your Google account'}</small></div>
                <div className="form-actions"><button className="add-button" type="submit" disabled={busy}>{editingId ? 'SAVE CHANGES' : '+ ADD TO WATCHLIST'}</button>{editingId && <button className="cancel-button" type="button" onClick={resetForm}>Cancel</button>}</div>
              </form>
              {(error || store.dataError) && <p className="error-message" role="alert">{error || store.dataError}</p>}
              <div className="movies-list">
                {backlog.length === 0 ? <div className="empty-list">Your watchlist is empty. Add a movie or series to give the wheel its first spin.</div> : backlog.map((movie, index) => (
                  <article className="movie-row" key={movie.id}>
                    <span className="movie-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="movie-info"><strong>{movie.title}</strong><span>{movie.year ?? 'Year unknown'} <span className="separator">·</span> {movie.genre ?? 'Genre not set'} <span className="separator">·</span> {lengthLabel(movie)} <span className="separator">·</span> Weight {movie.weight} <span className="separator">·</span> {chanceById.has(movie.id) ? `${((chanceById.get(movie.id) ?? 0) * 100).toFixed(1)}% chance` : 'Out tonight'}</span><span className="movie-byline">Added by {authorName(movie)}{movie.streamingService && <> <span className="separator">·</span> Streaming: {movie.streamingService}</>}</span></div>
                    <div className="movie-actions"><button title="Edit entry" aria-label={`Edit ${movie.title}`} onClick={() => startEdit(movie)}>Edit</button><button title="Mark watched" aria-label={`Mark ${movie.title} watched`} onClick={() => void changeStatus(movie)}>Watched</button><button title="Remove entry" aria-label={`Remove ${movie.title}`} onClick={(event) => askToRemove(movie, event.currentTarget)}>×</button></div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {watched.length > 0 && <section className="watched-section"><div><span className="eyebrow">THE CREDITS</span><h2 tabIndex={-1}>Already watched</h2></div><div className="watched-list">{watched.map((movie) => <div className="watched-row" key={movie.id}><div className="watched-info"><strong>{movie.title}{movie.year ? ` (${movie.year})` : ''}</strong><span>{movie.genre ?? 'Genre not set'} <span className="separator">·</span> {lengthLabel(movie)} <span className="separator">·</span> Added by {authorName(movie)}{movie.streamingService && <> <span className="separator">·</span> Streaming: {movie.streamingService}</>}</span></div><div><button onClick={() => void changeStatus(movie)}>Back to list</button><button aria-label={`Remove ${movie.title}`} onClick={(event) => askToRemove(movie, event.currentTarget)}>×</button></div></div>)}</div></section>}
          {isTmdbConfigured && <footer className="data-credits"><a href="https://www.themoviedb.org" target="_blank" rel="noreferrer"><img src={`${import.meta.env.BASE_URL}tmdb-logo.svg`} alt="TMDB" /></a><div><strong>Data credits</strong><p>This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is powered by <a href="https://www.justwatch.com" target="_blank" rel="noreferrer">JustWatch</a> and may change.</p></div></footer>}
        </main>
      )}

      {winner && <div className="result-overlay" role="dialog" aria-modal="true" aria-label="Watchlist pick selected" onClick={closeResult}><div className="result-card" onClick={(event) => event.stopPropagation()}><span className="eyebrow">AND TONIGHT’S PICK IS…</span><div className="result-sparkle">✦</div><h2>{winner.title}</h2><p>{winner.year ?? 'Year unknown'} <span className="separator">·</span> {winner.genre ?? 'Genre not set'} <span className="separator">·</span> {lengthLabel(winner)}</p><p className="result-byline">Added by {authorName(winner)}{winner.streamingService && <> <span className="separator">·</span> Streaming: {winner.streamingService}</>}</p><div className="result-actions"><button className="primary-button" onClick={() => void changeStatus(winner)}>Mark as watched</button><button className="secondary-button" onClick={closeResult}>Keep in the mix</button></div></div></div>}
      {movieToRemove && <RemoveMovieDialog movie={movieToRemove} removing={removingMovie} error={removeError} onCancel={closeRemoveDialog} onConfirm={() => void confirmRemoveMovie()} />}
    </div>
  )
}

export default App
