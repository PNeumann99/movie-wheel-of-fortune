import type { MovieStats } from './stats'

function titleCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function runtimeLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`
}

export function StatsPanel({ stats, error }: { stats: MovieStats; error: string | null }) {
  const topGenre = stats.topGenres[0]
  const tiedGenres = stats.topGenres.length - 1

  return (
    <section className="stats-section" aria-labelledby="stats-heading">
      <div className="stats-heading">
        <div><span className="eyebrow">THE BIG PICTURE</span><h2 id="stats-heading">Your movie nights in numbers</h2></div>
        <p>Across the whole shared list, including picks outside tonight’s wheel filters.</p>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="stats-grid">
        <article className="stat-card stat-card-featured">
          <span className="stat-label">01 / WATCHED COUNT</span>
          <strong className="stat-value">{stats.watchedCount}</strong>
          <h3>Titles watched</h3>
          <p>{titleCount(stats.watchedMovies, 'movie')} · {titleCount(stats.watchedSeries, 'series', 'series')}</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">02 / MOST-WATCHED GENRE</span>
          <strong className="stat-value stat-value-text">{topGenre ?? '—'}</strong>
          <h3>{topGenre ? 'Your top genre' : 'No genre yet'}</h3>
          <p>{topGenre ? `${titleCount(stats.topGenreCount, 'watched title')}${tiedGenres ? ` · tied with ${titleCount(tiedGenres, 'other genre')}` : ''}` : 'Watch a title with a genre to reveal this.'}</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">03 / MOVIE HOURS WATCHED</span>
          <strong className="stat-value stat-value-text">{stats.runtimeMovieCount ? runtimeLabel(stats.watchedRuntimeMinutes) : '—'}</strong>
          <h3>Time well spent</h3>
          <p>{stats.runtimeMovieCount ? `From ${titleCount(stats.runtimeMovieCount, 'movie')} with a known length.` : 'Add lengths to watched movies to see this.'}</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">04 / AVERAGE RELEASE YEAR</span>
          <strong className="stat-value">{stats.averageReleaseYear ?? '—'}</strong>
          <h3>A year in cinema</h3>
          <p>{stats.releaseYearCount ? `Based on ${titleCount(stats.releaseYearCount, 'watched title')} with a release year.` : 'No watched titles have a release year yet.'}</p>
        </article>
        <article className="stat-card stat-card-survivor">
          <span className="stat-label">05 / OLDEST BACKLOG SURVIVOR</span>
          <strong className="stat-value stat-value-title">{stats.oldestBacklog?.movie.title ?? '—'}</strong>
          <h3>{stats.oldestBacklog ? stats.oldestBacklog.daysWaiting === 0 ? 'Added today' : `Waiting ${titleCount(stats.oldestBacklog.daysWaiting, 'day')}` : 'Nothing waiting yet'}</h3>
          <p>{stats.oldestBacklog ? 'The longest-standing title still on the watchlist.' : 'Add a movie or series to start the clock.'}</p>
        </article>
      </div>
    </section>
  )
}
