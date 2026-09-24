const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']
const missing = required.filter((name) => !process.env[name])

if (missing.length) {
  console.error(`Missing GitHub Actions secrets: ${missing.join(', ')}`)
  process.exit(1)
}

const workerUrlValue = process.env.VITE_TMDB_WORKER_URL?.trim()
if (!workerUrlValue) {
  console.error('TMDB_WORKER_URL is empty. Add it under Repository Settings → Secrets and variables → Actions → Variables (not an environment-specific variable).')
  process.exit(1)
}

try {
  const workerUrl = new URL(workerUrlValue)
  if (workerUrl.protocol !== 'https:') throw new Error('HTTPS required')
} catch {
  console.error('TMDB_WORKER_URL must be a full HTTPS URL, for example https://movie-wheel-tmdb.example.workers.dev')
  process.exit(1)
}
