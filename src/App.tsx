import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { getWheelSegments, pickWeightedMovie, type WheelSegment } from './wheel'
import { useMovieStore } from './useMovieStore'
import type { Movie, MovieDetails } from './types'
import './App.css'

const colors = ['#f8b85e', '#dd7969', '#9d93dc', '#69b9a7', '#e6a0bd', '#89a9d8', '#d5bd7d', '#8dc5c1']

function point(angle: number, radius: number) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: 250 + Math.cos(radians) * radius, y: 250 + Math.sin(radians) * radius }
}

function slicePath(segment: WheelSegment) {
  const start = point(segment.startAngle, 220)
  const end = point(segment.startAngle + segment.sweepAngle, 220)
  return `M 250 250 L ${start.x} ${start.y} A 220 220 0 ${segment.sweepAngle > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`
}

function Wheel({ movies, rotation, spinning }: { movies: Movie[], rotation: number, spinning: boolean }) {
  const segments = getWheelSegments(movies)

  return (
    <div className={`wheel-wrap ${spinning ? 'is-spinning' : ''}`}>
      <div className="wheel-pointer" aria-hidden="true" />
      <svg className="wheel" viewBox="0 0 500 500" role="img" aria-label={movies.length ? 'Movie selection wheel' : 'Empty movie wheel'} style={{ transform: `rotate(${rotation}deg)` }}>
        <circle cx="250" cy="250" r="235" fill="#20243b" />
        {segments.length === 0 && (
          <>
            <circle cx="250" cy="250" r="218" fill="#31364e" />
            <circle cx="250" cy="250" r="184" className="empty-wheel-ring" />
            <text x="250" y="216" className="empty-wheel-spark">✦</text>
            <text x="250" y="258" className="empty-wheel-text">NO MOVIES YET</text>
            <text x="250" y="290" className="empty-wheel-subtext">Add one to get started</text>
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
  const [year, setYear] = useState('')
  const [weight, setWeight] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [spinMovies, setSpinMovies] = useState<Movie[] | null>(null)
  const [winner, setWinner] = useState<Movie | null>(null)
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const backlog = useMemo(() => store.movies.filter((movie) => movie.status === 'backlog'), [store.movies])
  const watched = useMemo(() => store.movies.filter((movie) => movie.status === 'watched'), [store.movies])
  const segments = useMemo(() => getWheelSegments(backlog), [backlog])
  const chanceById = useMemo(() => new Map(segments.map((segment) => [segment.movie.id, segment.chance])), [segments])

  useEffect(() => () => { if (spinTimer.current) clearTimeout(spinTimer.current) }, [])

  function resetForm() {
    setTitle('')
    setYear('')
    setWeight(1)
    setEditingId(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    const parsedYear = year.trim() ? Number(year) : null
    if (!cleanTitle) return setError('Add a movie title first.')
    if (cleanTitle.length > 120) return setError('Keep the title under 120 characters.')
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1888 || parsedYear > 2100)) return setError('Enter a valid release year.')
    if (!Number.isInteger(weight) || weight < 1 || weight > 10) return setError('Choose a weight between 1 and 10.')

    const details: MovieDetails = { title: cleanTitle, year: parsedYear, weight }
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

  async function removeMovie(movie: Movie) {
    if (!window.confirm(`Remove “${movie.title}” from the list?`)) return
    setError(null)
    try {
      await store.removeMovie(movie.id)
      if (editingId === movie.id) resetForm()
      if (winner?.id === movie.id) closeResult()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the movie.')
    }
  }

  function startEdit(movie: Movie) {
    setTitle(movie.title)
    setYear(movie.year?.toString() ?? '')
    setWeight(movie.weight)
    setEditingId(movie.id)
    document.querySelector('#movie-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function closeResult() {
    setWinner(null)
    setSpinMovies(null)
  }

  function spin() {
    if (spinning || backlog.length === 0) return
    const selected = pickWeightedMovie(backlog)
    if (!selected) return
    const segment = segments.find((item) => item.movie.id === selected.id)
    if (!segment) return

    const center = segment.startAngle + segment.sweepAngle / 2
    const current = ((rotation % 360) + 360) % 360
    const alignment = (((-center - current) % 360) + 360) % 360
    setWinner(null)
    setSpinMovies(backlog)
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
              <p>A shared list of films you want to see. Give your favorites a little extra luck, then spin to decide what’s on tonight.</p>
            </div>
            <div className="intro-count"><strong>{backlog.length}</strong><span>MOVIES IN THE MIX</span></div>
          </section>

          <div className="dashboard">
            <section className="wheel-card" aria-label="Spin the movie wheel">
              <div className="card-topline"><span>01 / THE DECIDER</span><span className="tiny-star">✦</span></div>
              <Wheel movies={spinMovies ?? backlog} rotation={rotation} spinning={spinning} />
              <div className="wheel-actions">
                <button className="spin-button" onClick={spin} disabled={spinning || backlog.length === 0}>{spinning ? 'SPINNING…' : 'SPIN THE WHEEL'} <span>↗</span></button>
                <p>More weight means a bigger slice and a better chance.</p>
              </div>
            </section>

            <section className="list-card">
              <div className="card-topline"><span>02 / THE BACKLOG</span><span>{backlog.length} FILMS</span></div>
              <div className="list-heading"><h2>The watchlist</h2><p>Every great movie night starts somewhere.</p></div>
              <form id="movie-form" className="movie-form" onSubmit={(event) => void handleSubmit(event)}>
                <label htmlFor="movie-title">MOVIE TITLE</label>
                <input id="movie-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Everything Everywhere All at Once" maxLength={120} />
                <div className="form-row">
                  <div><label htmlFor="movie-year">YEAR <span>(OPTIONAL)</span></label><input id="movie-year" type="number" min="1888" max="2100" value={year} onChange={(event) => setYear(event.target.value)} placeholder="2022" /></div>
                  <div><label htmlFor="movie-weight">WEIGHT <span>(1–10)</span></label><input id="movie-weight" type="number" min="1" max="10" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></div>
                </div>
                <div className="form-actions"><button className="add-button" type="submit" disabled={busy}>{editingId ? 'SAVE CHANGES' : '+ ADD TO WATCHLIST'}</button>{editingId && <button className="cancel-button" type="button" onClick={resetForm}>Cancel</button>}</div>
              </form>
              {(error || store.dataError) && <p className="error-message" role="alert">{error || store.dataError}</p>}
              <div className="movies-list">
                {backlog.length === 0 ? <div className="empty-list">Your watchlist is empty. Add a movie to give the wheel its first spin.</div> : backlog.map((movie, index) => (
                  <article className="movie-row" key={movie.id}>
                    <span className="movie-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="movie-info"><strong>{movie.title}</strong><span>{movie.year ?? 'Year unknown'} <span className="separator">·</span> Weight {movie.weight} <span className="separator">·</span> {((chanceById.get(movie.id) ?? 0) * 100).toFixed(1)}% chance</span></div>
                    <div className="movie-actions"><button title="Edit movie" aria-label={`Edit ${movie.title}`} onClick={() => startEdit(movie)}>Edit</button><button title="Mark watched" aria-label={`Mark ${movie.title} watched`} onClick={() => void changeStatus(movie)}>Watched</button><button title="Remove movie" aria-label={`Remove ${movie.title}`} onClick={() => void removeMovie(movie)}>×</button></div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {watched.length > 0 && <section className="watched-section"><div><span className="eyebrow">THE CREDITS</span><h2>Already watched</h2></div><div className="watched-list">{watched.map((movie) => <div className="watched-row" key={movie.id}><span>{movie.title}{movie.year ? ` (${movie.year})` : ''}</span><div><button onClick={() => void changeStatus(movie)}>Back to list</button><button aria-label={`Remove ${movie.title}`} onClick={() => void removeMovie(movie)}>×</button></div></div>)}</div></section>}
        </main>
      )}

      {winner && <div className="result-overlay" role="dialog" aria-modal="true" aria-label="Movie selected" onClick={closeResult}><div className="result-card" onClick={(event) => event.stopPropagation()}><span className="eyebrow">AND TONIGHT’S PICK IS…</span><div className="result-sparkle">✦</div><h2>{winner.title}</h2>{winner.year && <p>{winner.year}</p>}<div className="result-actions"><button className="primary-button" onClick={() => void changeStatus(winner)}>Mark as watched</button><button className="secondary-button" onClick={closeResult}>Keep in the mix</button></div></div></div>}
    </div>
  )
}

export default App
