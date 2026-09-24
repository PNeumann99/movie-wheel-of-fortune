const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']
const missing = required.filter((name) => !process.env[name])

if (missing.length) {
  console.error(`Missing GitHub Actions variables: ${missing.join(', ')}`)
  process.exit(1)
}
