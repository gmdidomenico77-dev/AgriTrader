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

## UI/UX Design Direction

### Aesthetic Goal
Modern agricultural fintech feel — data-dense but approachable. 
Think Bloomberg Terminal meets a clean consumer app. 
Professional enough for a congressional presentation, 
intuitive enough for a local farmer with no tech background.

### Design Principles
- Every static element should have a reason to be static — default to animation
- Data should feel alive: charts animate on load, numbers count up, prices pulse on update
- Color palette: deep greens, earthy ambers, clean whites — avoid generic blues
- Typography: use a distinctive display font for headers, clean sans-serif for data
- Cards should have depth (subtle shadows, hover states, micro-interactions)
- Mobile-responsive — assume the user is on their phone in a field

### Component Priorities (in order)
1. Price forecast chart — needs smooth animations, real-time feel
2. Dashboard header/hero — first impression, needs to wow
3. Marketplace listings — should feel like a modern e-commerce card grid
4. Navigation — clean, intuitive, modern
5. Data tables — readable, sortable, not boring

### What to Avoid
- Purple gradients on white (generic AI look)
- Inter/Roboto fonts (overused)
- Flat static cards with no interaction
- Generic dashboard templates that look like every SaaS app

### Reference Aesthetic
- Linear.app (clean, fast, modern)
- Stripe Dashboard (data-rich but beautiful)
- Robinhood (financial data made approachable)