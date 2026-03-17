# Weather API Setup Guide

## How to Get Real Weather Data

The app can now display **real weather data** from OpenWeather API instead of mock data!

### Step 1: Get Your Free API Key

1. Go to https://openweathermap.org/api
2. Click "Sign Up" to create a free account
3. Navigate to "API keys" section
4. Generate a new API key (free tier allows 60 calls/minute)

### Step 2: Add Your API Key

Edit the file: `AgriTrader/lib/weatherService.ts`

Find this line (line 10):
```typescript
const OPENWEATHER_API_KEY = 'YOUR_API_KEY_HERE';
```

Replace it with your actual API key:
```typescript
const OPENWEATHER_API_KEY = 'your-actual-api-key-here';
```

### Step 3: Restart the App

After adding your API key, restart your React Native app to see real weather data.

### What You'll See

- **Current temperature** for your location
- **Weather description** (sunny, cloudy, etc.)
- **Real-time weather conditions**

The app will automatically fall back to mock data if:
- API key is not configured
- API call fails
- Rate limit is exceeded

---

**Note:** The free tier is perfect for development! You'll get 60 calls/minute which is more than enough for testing.

