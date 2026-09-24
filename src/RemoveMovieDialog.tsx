import { useEffect, useRef } from 'react'
import type { Movie } from './types'

interface RemoveMovieDialogProps {
  movie: Movie
  removing: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function RemoveMovieDialog({ movie, removing, error, onCancel, onConfirm }: RemoveMovieDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="remove-dialog"
      aria-labelledby="remove-dialog-title"
      aria-describedby="remove-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!removing) onCancel()
      }}
    >
      <div className="remove-dialog-icon" aria-hidden="true">×</div>
      <span className="eyebrow">REMOVE FROM THE LIST</span>
      <h2 id="remove-dialog-title">Remove this {movie.kind === 'series' ? 'series' : 'movie'}?</h2>
      <p id="remove-dialog-description"><strong>“{movie.title}”</strong> will be removed from the shared watchlist. This cannot be undone.</p>
      {error && <p className="remove-dialog-error" role="alert">{error}</p>}
      <div className="remove-dialog-actions">
        <button type="button" className="remove-dialog-cancel" onClick={onCancel} disabled={removing} autoFocus>Keep movie</button>
        <button type="button" className="remove-dialog-confirm" onClick={onConfirm} disabled={removing}>{removing ? 'REMOVING…' : 'REMOVE MOVIE'}</button>
      </div>
    </dialog>
  )
}
