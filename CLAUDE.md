# AgriTrader — CLAUDE.md

## Project Overview
AgriTrader is an AI-powered agricultural marketplace and price forecasting 
platform. Farmers can view real-time crop prices, get ML-based sell-time 
recommendations, and buy/sell crops with other users on the marketplace.

## Tech Stack
- Frontend: [React Native]
- Backend: [Python ]
- Database: [Firebase ]
- AI/ML: [.pkl files, AgriTrader_API.py]
- Hosting: [No hosting yet, goal is to deploy]

## Project Structure
- /frontend or /client — UI code
- /backend or /server — API, ML models
- /components — reusable UI components
- [add any other key folders]

## Current Priorities
1. Improve UI/UX — make frontend dynamic, add animations, polish visuals
2. Fix AI model connectivity issue (only works with firewall disabled)
3. Prep for House of Code presentation in Washington D.C. on April 21-22

## Known Issues
- AI models fail to connect unless laptop firewall is disabled — likely 
  a network/CORS/outbound request issue, needs investigation
- Frontend is mostly static, needs animations and dynamic elements


## What NOT to Touch
- [don't change the Firebase schema without asking]

## Context
- Won Congressional App Challenge PA-16 with this app
- Target users are local farmers — UI should feel approachable, not overly technical
- Presenting live at House of Code, D.C. — app needs to look polished and work reliably