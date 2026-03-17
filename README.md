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

By default, the frontend will call the backend on `http://localhost:5000` (you can change this via environment variables once deployment is configured).

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

### Deployment (high level)

- **Backend**: build a Docker image that installs `AgriTrader/backend/requirements.txt`, copies the ML model and CSV files, and runs `backend/app.py`. Deploy that image to Railway, Render, or a similar platform and expose port 5000.
- **Frontend (web)**: use Expo for web and configure Vercel to build the web bundle and serve it, with an `API_BASE_URL` environment variable pointing at the hosted backend.

See the internal plan file `/.cursor/plans/agritrader-cloud-deploy-and-polish_72b6ddb4.plan.md` for a more detailed breakdown of deployment and UX improvements.

