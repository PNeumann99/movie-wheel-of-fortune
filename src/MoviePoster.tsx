import { useState } from 'react'

export function MoviePoster({ path }: { path?: string | null }) {
  const [failedPath, setFailedPath] = useState<string | null>(null)
  const safePath = path && /^\/[\w-]+\.(?:jpg|jpeg|png|webp)$/.test(path) ? path : null

  return safePath && failedPath !== safePath
    ? <img className="backlog-poster" src={`https://image.tmdb.org/t/p/w342${safePath}`} alt="" width="342" height="513" loading="lazy" decoding="async" onError={() => setFailedPath(safePath)} />
    : <div className="backlog-poster poster-placeholder"><span aria-hidden="true">✦</span><span>No poster</span></div>
}
