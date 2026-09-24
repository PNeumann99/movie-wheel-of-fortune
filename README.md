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
2. In **Repository Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow runs tests, lint, and a build before deploying. It fails if the Firebase secrets are missing, so the hosted app cannot silently become a browser-only preview.

The secret values stay out of the Git repository and GitHub's repository settings do not display their contents after saving. The production build embeds these values in browser JavaScript, so visitors can still see them. This is expected for Firebase Web apps. Do not use a service-account key or a Google API key that grants access to unrelated services here. If a credential must remain secret from visitors, it requires a server-side component and cannot be used directly from this GitHub Pages app.

## Data and odds

The `movies` collection stores title, optional year, required genre, optional streaming service, weight (1–10), status, creation time, and the adding user's ID and display name. The author is filled from the signed-in account and cannot be changed while editing a movie. Every member can add, edit, mark watched, and remove movies. Watched movies leave the wheel but can be returned to the backlog. Each active movie's selection chance is `movie weight / sum of active weights`; the visual slice uses the same fraction.

Movies created before genre and author name were added remain readable and can still be marked watched. They show “Genre not set” until edited. The app looks up existing authors from `members/{userId}` when possible.
