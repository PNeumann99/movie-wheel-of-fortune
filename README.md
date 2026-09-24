# Movie Night

A shared movie backlog with a weighted wheel. Movies with a higher weight occupy a larger slice and have a proportionally higher chance of being selected.

## Run locally

```bash
npm install
npm run dev
```

Without Firebase settings, the app runs in **local preview mode**. Preview movies are stored in your browser only. Run `npm test`, `npm run lint`, and `npm run build` to check changes.

## Set up the shared list

1. Create a Firebase project and register a **Web app** in the [Firebase console](https://console.firebase.google.com/).
2. Enable **Authentication → Sign-in method → Google**. Add `localhost` and `pneumann99.github.io` to **Authentication → Settings → Authorized domains** as needed.
3. Create a **Cloud Firestore** database. Paste [firestore.rules](./firestore.rules) into **Firestore → Rules** and publish it. Publish the updated rules before deploying app changes that add new movie fields. The rules deny movie access until a member document exists for the signed-in user.
4. Copy `.env.example` to `.env.local` and fill in the four values from the Firebase Web app config. Restart the dev server. `.env.local` is Git-ignored. The Firebase Web API key is public by design; access to movie data is enforced by Firestore rules.
5. Sign in. The app shows your Firebase user ID. In Firestore, create a document at `members/YOUR_USER_ID` with a `name` string field. The app will unlock automatically. Repeat this for each friend after they sign in and send you their user ID. Member names appear on movies they added; Google names are used when a member document has no name. You can remove access by deleting their member document.

The current version has one shared backlog. Membership is managed in the Firebase console; an in-app invitation flow can be added later.

## GitHub Pages

The repository includes a GitHub Actions workflow for `https://pneumann99.github.io/movie-wheel-of-fortune/`.

1. In **Repository Settings → Secrets and variables → Actions → Secrets**, add four **repository secrets** named `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` using the same values as `.env.local`.
2. In **Repository Settings → Secrets and variables → Actions → Variables → New repository variable**, add `TMDB_WORKER_URL` containing the full deployed Cloudflare Worker URL (for example, `https://movie-wheel-tmdb.your-subdomain.workers.dev`). The build job reads this repository variable and passes it to Vite as `VITE_TMDB_WORKER_URL`. A variable under **Environments → github-pages** is not available to that build job. This URL is public; it contains no credential.
3. In **Repository Settings → Pages**, set **Source** to **GitHub Actions**.
4. Push to `main`. The workflow runs tests, lint, and a build before deploying. It fails if Firebase settings or the Worker URL are missing, so the hosted app cannot silently lose its shared features.

The secret values stay out of the Git repository and GitHub's repository settings do not display their contents after saving. The production build embeds these values in browser JavaScript, so visitors can still see them. This is expected for Firebase Web apps. Do not use a service-account key or a Google API key that grants access to unrelated services here. If a credential must remain secret from visitors, it requires a server-side component and cannot be used directly from this GitHub Pages app.

## TMDB movie search

The app searches TMDB through a [Cloudflare Worker](./worker/index.js), so the TMDB API Read Access Token never enters the Git repository or browser bundle. Do **not** add the TMDB token to a `VITE_` variable or a GitHub Actions build secret. The Worker can run on Cloudflare's free plan; Firebase remains on its free plan. Only signed-in members can use the Worker: it sends their Firebase ID token to the Firestore REST API to check their `members/{uid}` document under the existing security rules.

1. Create a Cloudflare account and run `npx wrangler login` locally.
2. Review `ALLOWED_ORIGINS` in [worker/wrangler.jsonc](./worker/wrangler.jsonc) if your GitHub Pages or local development origin differs.
3. Run `npx wrangler secret put FIREBASE_PROJECT_ID_SECRET --config worker/wrangler.jsonc`. Paste the **Project ID** shown in Firebase Console → Project settings → General. The project ID is public in the browser app, but this keeps it out of the Worker configuration in Git.
4. Run `npx wrangler secret put TMDB_READ_ACCESS_TOKEN --config worker/wrangler.jsonc`. Paste the **API Read Access Token** at Wrangler's prompt. Cloudflare stores it as a Worker secret. Do not put this value in source code, `.env.local`, or GitHub Actions.
5. Run `npm run worker:deploy`. Wrangler prints a public Worker URL. Future deploys preserve the two Worker secrets.
6. Add the Worker URL as the GitHub Actions variable `TMDB_WORKER_URL` from the previous section. For local testing, set `VITE_TMDB_WORKER_URL` to that URL in your ignored `.env.local` and restart Vite.

For fully local Worker development, copy [worker/.dev.vars.example](./worker/.dev.vars.example) to `worker/.dev.vars`, fill in the token and Firebase project ID, and run `npm run worker:dev`. The file is Git-ignored. Set `VITE_TMDB_WORKER_URL=http://127.0.0.1:8787` in `.env.local` and use a Firebase signed-in member account in the local app. The Worker still checks the real Firestore membership document.

Search results fill title, release year, runtime in minutes, the first matching app genre, and a supported German subscription service when TMDB lists one. Weight starts at 1 and the contributor comes from Google sign-in. Review the form before saving; TMDB availability data can change. Movies can also be added manually. Select **Series** to add a series manually; series have no runtime field and are included in the same wheel.

For the movie runtime and series update, publish the revised [firestore.rules](./firestore.rules) in Firebase before merging the frontend branch into `main`, then run `npm run worker:deploy` to make TMDB runtimes available. Older watchlist entries remain valid and show an unknown length until edited. The Worker update preserves existing secrets.

The [TMDB logo](./public/tmdb-logo.svg) is the approved TMDB artwork sourced through [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tmdb.new.logo.svg) (Travis Bell, CC BY-SA 4.0). The app displays TMDB and JustWatch attribution in its data credits.

## Data and odds

The `movies` collection stores title, optional year, required genre, optional streaming service, weight (1–10), status, creation time, and the adding user's ID and display name. The author is filled from the signed-in account and cannot be changed while editing a movie. Every member can add, edit, mark watched, and remove movies. Watched movies leave the wheel but can be returned to the backlog. Each active movie's selection chance is `movie weight / sum of active weights`; the visual slice uses the same fraction.

Tonight's filters let you skip genres, set an inclusive release-year range, and choose a contributor. They affect only the wheel and its odds; the full backlog remains visible and editable. Movies without a year are excluded while a year limit is active. Filters reset when the page reloads and do not change stored movies.

Movies created before genre and author name were added remain readable and can still be marked watched. They show “Genre not set” until edited. The app looks up existing authors from `members/{userId}` when possible.
