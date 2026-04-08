## AgriTrader

AgriTrader is an Expo / React Native application for crop farmers that combines:

- Firebase authentication and user profiles
- An ML-powered price forecast screen for corn, soybeans, and wheat
- A marketplace for listings and preorders
- A Python / Flask backend that serves trained ML models and real PA price data

This README focuses on how to run the app locally and how to deploy it to cloud hosting (Vercel for the web frontend and a container host like Railway/Render for the backend).

### Project layout

- `App.tsx`, `app/`, `components/`, `lib/` – Expo/React Native frontend
- `backend/` – Flask API and ML integration code
- `data.csv`, `AgriTrader_API.py`, `daily_data_updater.py`, model/scaler files – ML models and data utilities

### Local development

From the `ML_PROJ` directory:

```bash
# 1. Start the backend (Flask + ML)
python AgriTrader/start_agritrader.py

# 2. Start the Expo frontend
cd AgriTrader
npm install
npm start
```

On native simulators/devices, the frontend defaults to `http://localhost:5000/api` (Android emulator uses `10.0.2.2`). **Web builds (including Vercel) do not use those defaults** — set `EXPO_PUBLIC_API_URL` at build time (see below).

### Git & GitHub

This directory is already initialized as a Git repository. To push to GitHub:

```bash
cd AgriTrader
git remote add origin https://github.com/<your-username>/agritrader-app.git
git add .
git commit -m "Initial AgriTrader import"
git push -u origin main
```

Replace `<your-username>` and repository name as desired.

### Deployment: Vercel (Expo web) + public backend

The web app is a static export from `expo export --platform web` (output directory: **`dist`**). Environment variables prefixed with `EXPO_PUBLIC_` are inlined at **build** time; changing them requires a new Vercel deployment.

#### 1. Backend (public URL, not localhost)

1. Run the Flask app so it listens on all interfaces (already `host='0.0.0.0'`, port `5000` in `backend/app.py`).
2. Put the API behind your host’s HTTPS URL (e.g. Railway/Render/Fly/Docker + reverse proxy). The browser will call routes under **`/api`** (e.g. `https://your-api.example.com/api/health`).
3. Set **`FRONTEND_ORIGIN`** to the exact origin(s) allowed to call the API (scheme + host + port, no path). Use a comma-separated list if you need more than one, for example production and a Vercel preview URL:

   ```bash
   FRONTEND_ORIGIN=https://agritrader.vercel.app,https://agritrader-git-main-yourteam.vercel.app
   ```

   Local Expo web ports remain allowed without setting this (`http://localhost:19006`, `http://localhost:8081`).

#### 2. Frontend on Vercel

1. In the [Vercel dashboard](https://vercel.com), import this Git repository and set the project **root** to the `AgriTrader` folder if the repo contains other projects.
2. Vercel reads **`vercel.json`**: build command `npm run export:web`, output **`dist`**, and SPA **`rewrites`** so client-side navigation keeps working.
3. Under **Settings → Environment Variables**, add **`EXPO_PUBLIC_API_URL`** for Production and Preview as needed (e.g. `https://your-api.example.com/api`). It must include the `/api` prefix and should not have a trailing slash after `api`. **`FRONTEND_ORIGIN` is configured only on the Flask server** (see step 1 above), not in Vercel.

4. Deploy. After the backend URL is stable, confirm `EXPO_PUBLIC_API_URL` matches it and redeploy if you change hosts.

#### 3. Local web build against a deployed API

```bash
cd AgriTrader
set EXPO_PUBLIC_API_URL=https://your-api.example.com/api
npm run export:web
```

(On Unix shells, use `export EXPO_PUBLIC_API_URL=...` instead of `set`.)

#### Backend packaging (reminder)

Build a Docker image (or equivalent) that installs `backend/requirements.txt`, includes ML model/data files expected by `app.py`, and runs `backend/app.py`. Expose port **5000** (or map it to 443 at the edge).

See the internal plan file `/.cursor/plans/agritrader-cloud-deploy-and-polish_72b6ddb4.plan.md` for a broader deployment and UX checklist.

