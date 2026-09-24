const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']
const missing = required.filter((name) => !process.env[name])

if (missing.length) {
  console.error(`Missing GitHub Actions secrets: ${missing.join(', ')}`)
  process.exit(1)
}

try {
  const workerUrl = new URL(process.env.VITE_TMDB_WORKER_URL)
  if (workerUrl.protocol !== 'https:') throw new Error('HTTPS required')
} catch {
  console.error('Missing or invalid GitHub Actions variable: VITE_TMDB_WORKER_URL')
  process.exit(1)
}
