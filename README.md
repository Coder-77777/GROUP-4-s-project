# GROUP 4 AI ENGINE — Detailed Developer README

## Project Overview

This repository implements an AI-powered educational quiz application with a frontend single-page app and a backend API.

- `server.js` — Express server that handles user authentication, quiz generation, history persistence, and leaderboard/dashboard APIs.
- `app.js` — Browser-side JavaScript that manages screen navigation, authentication flow, quiz generation requests, quiz-taking logic, and result display.
- `index.html` — HTML shell for the SPA, with placeholders for login/register, dashboard, quiz setup, quiz interaction, and results.
- `package.json` — Node dependency manifest and run scripts.

## Architecture Summary

### Backend (`server.js`)

The backend is organized in these sections:

1. **Environment and configuration**
   - Uses `dotenv` to load environment variables.
   - `JWT_SECRET` is required for signing tokens; falls back to `SESSION_SECRET` or a local default.

2. **Middleware**
   - `cors` enabled for cross-origin requests.
   - `express.json()` and `express.urlencoded()` to parse request bodies.

3. **Database layer**
   - Uses `mongoose` and a `User` model with nested `quizHistory` documents.
   - The schema includes `username`, `email`, `password`, and `quizHistory` entries.
   - When MongoDB is unavailable, the app continues with in-memory fallback storage for development.

4. **Authentication**
   - JWT-based auth middleware verifies `Authorization: Bearer <token>`.
   - User routes include `/register`, `/login`, and `/me`.

5. **App logic helpers**
   - Email validation.
   - Average score, highest score, and quiz count calculations.
   - Fallback helper functions: `findUserByEmail`, `findUserById`, `createNewUser`, `saveUser`, `findAllUsers`, and `findQuizById`.

6. **Quiz generation**
   - `generateQuizPlaceholder()` returns a workable sample quiz when Gemini AI is unavailable.
   - `generateQuizWithGemini()` integrates with `@google/generative-ai` if a valid `GEMINI_API_KEY` exists.
   - The server accepts `POST /generate-quiz` and returns `questions`, `topic`, and metadata.

7. **Result persistence**
   - Endpoints: `/save-result`, `/result/:id`, and `/result/:id` DELETE.
   - Quiz results are stored in the user’s `quizHistory` array.

8. **Analytics and leaderboard**
   - `/dashboard` returns metrics and recent quiz history.
   - `/history` returns the full quiz history.
   - `/leaderboard` returns top users by average score.

9. **SPA routing**
   - `/` serves `index.html`.
   - `/api/status` provides a lightweight status check.
   - Static file serving is configured after API routes.

### Frontend (`app.js`)

The frontend is a vanilla JavaScript SPA with these zones:

1. **State management**
   - `state` stores auth token, user data, quiz state, timer, and generated questions.

2. **DOM references**
   - Consumes known IDs such as `loginEmail`, `loginPassword`, `dashboardScreen`, `quizScreen`, `resultScore`, `optionsContainer`, and more.

3. **Helpers**
   - `apiFetch()` wraps `fetch()` and injects JSON headers + auth token.
   - `showScreen()` toggles SPA screens and triggers dashboard refresh.

4. **Authentication workflow**
   - `registerUser()` sends `POST /register`.
   - `loginUser()` sends `POST /login` and stores token in `localStorage`.
   - `logoutUser()` clears local auth state.

5. **Dashboard and analytics**
   - `loadDashboard()` fetches `/dashboard`.
   - `renderDashboard()` updates metric values and recent quizzes.

6. **Quiz generation and flow**
   - `createQuiz()` sends `/generate-quiz` with syllabus text, difficulty, question count, and topic.
   - `renderQuestion()` displays question text and options.
   - `submitQuiz()` computes score, saves results, and shows final metrics.

7. **Timer and results**
   - `startTimer()` and `stopTimer()` track elapsed quiz duration.
   - `saveResults()` persists results via `/save-result`.

8. **Initialization**
   - `initializeApp()` binds UI buttons and chooses the initial screen based on auth state.

## Index HTML and UI mapping

`index.html` includes the following important IDs that are referenced by `app.js`:

- `loginScreen`, `registerScreen`, `dashboardScreen`, `setupScreen`, `quizScreen`, `resultsScreen`
- `loginEmail`, `loginPassword`, `loginButton`, `loginMessage`
- `registerName`, `registerEmail`, `registerPassword`, `registerButton`, `registerMessage`
- `avgScoreValue`, `quizzesCompletedValue`, `highestScoreValue`, `recentQuizzesList`
- `syllabusInput`, `topicInput`, `difficultyInput`, `questionCountInput`, `generateButton`, `cancelSetupButton`, `setupMessage`
- `timerValue`, `questionCounter`, `questionText`, `optionsContainer`, `quizMessage`
- `resultScore`, `resultGrade`, `resultSummary`, `backToDashboardButton`, `logoutButton`

If any of these IDs are missing from `index.html`, the client will not initialize correctly.

## Environment variables

Create a `.env` file when needed with:

```env
PORT=3000
JWT_SECRET=your-secret-key
MONGO_URI=mongodb://127.0.0.1:27017/group4_db
GEMINI_API_KEY=your-gemini-key
```

- `PORT` defaults to `5000` if omitted.
- `JWT_SECRET` is required for authentication tokens.
- `MONGO_URI` enables MongoDB storage; if Mongo is unreachable, the app falls back to in-memory storage.
- `GEMINI_API_KEY` is optional; without it, the app generates placeholder quizzes.

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Start MongoDB if available:

- Use a local MongoDB instance on `mongodb://127.0.0.1:27017`.
- Or set `MONGO_URI` to your MongoDB connection string.

3. Start the server:

```bash
node server.js
```

4. Open the app in your browser:

- `http://localhost:5000` by default

## Code notes and troubleshooting

### If the server startup fails with `EADDRINUSE`

- Another process is already using port `3000`.
- Use `netstat -ano | findstr ":3000"` and stop the process, or change `PORT`.

### If MongoDB is unreachable

- The app logs `MongoDB Error: ...` but continues in development with in-memory storage.
- This means all data will be lost when the process restarts.

### If `generate-quiz` returns `Invalid token`

- Confirm login succeeded and `localStorage` contains the JWT token.
- Ensure the frontend `Authorization` header is being sent.

### If the UI does not load or buttons fail

- Verify `index.html` and `app.js` are both present and not blocked by static routing.
- Confirm the HTML IDs match the DOM references declared in `app.js`.

## Project file relationships

- `server.js` exposes backend endpoints and serves `index.html`.
- `index.html` is the single page shell that loads `app.js`.
- `app.js` is the client logic that communicates with backend endpoints such as:
  - `POST /register`
  - `POST /login`
  - `GET /dashboard`
  - `POST /generate-quiz`
  - `POST /save-result`
  - `GET /history`
  - `GET /leaderboard`

## Recommended next step

- Verify the app by running `node server.js`, then opening the browser and performing register/login/quiz generation.
- If MongoDB is not available, the app still works with the in-memory fallback but does not persist data after restart.
