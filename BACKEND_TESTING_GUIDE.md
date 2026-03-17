# Backend Testing Guide - AgriTrader ML Predictions

## Quick Diagnosis: Are You Using Backend or Mock Data?

Your app has **TWO data sources**:
1. ✅ **Backend API** (ML predictions from Flask server) - WHAT YOU WANT
2. ❌ **Mock/CSV fallback data** (hardcoded values) - WHAT YOU'RE GETTING NOW

---

## Step 1: Test Backend Directly (Verify It's Working)

### Option A: Using Your Browser
Open these URLs in your browser while backend is running:

```
http://localhost:5000/api/health
http://localhost:5000/api/predict/corn (POST request)
```

**Expected output for `/api/health`:**
```json
{
  "status": "healthy",
  "models_loaded": 3,
  "available_models": ["corn", "soybeans", "wheat"]
}
```

### Option B: Using PowerShell (Windows)
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET

# Test prediction endpoint
$body = @{
    location = "PA"
    days = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/predict/corn" -Method POST -Body $body -ContentType "application/json"
```

### Option C: Using curl (if you have it)
```bash
# Test health
curl http://localhost:5000/api/health

# Test prediction
curl -X POST http://localhost:5000/api/predict/corn \
  -H "Content-Type: application/json" \
  -d '{"location": "PA", "days": 1}'
```

**If these work**, your backend is running correctly! ✅

---

## Step 2: Fix React Native Connection Issue

### The Problem
React Native can't connect to `localhost:5000` because:
- **Android Emulator**: `localhost` points to the emulator itself, not your computer
- **Physical Device**: `localhost` doesn't exist

### The Solution - Update API Configuration

You need to:
1. Find your computer's IP address
2. Update the API URL in your React Native app

#### Get Your Computer's IP Address:

**Windows (PowerShell):**
```powershell
ipconfig | findstr IPv4
```
Look for something like `192.168.1.xxx`

**Example output:**
```
IPv4 Address. . . . . . . . . . . : 192.168.1.105
```

---

## Step 3: Configure the API URL

I'll create a config file that lets you easily switch between different environments:

### Create `AgriTrader/lib/config.ts`:
```typescript
// API Configuration for different environments

// Determine which API URL to use based on your setup
export const API_CONFIG = {
  // For Android Emulator (use this if running on Android emulator)
  ANDROID_EMULATOR: 'http://10.0.2.2:5000/api',
  
  // For iOS Simulator (use this if running on iOS simulator)
  IOS_SIMULATOR: 'http://localhost:5000/api',
  
  // For Physical Device or Different Computer
  // REPLACE '192.168.1.XXX' with YOUR computer's IP address from Step 2
  PHYSICAL_DEVICE: 'http://192.168.1.XXX:5000/api',
  
  // For Web (Expo Web)
  WEB: 'http://localhost:5000/api',
};

// AUTO-DETECT: Uncomment the setup you're using
// =============================================

// 1. If you're on Android Emulator:
export const API_BASE_URL = API_CONFIG.ANDROID_EMULATOR;

// 2. If you're on iOS Simulator:
// export const API_BASE_URL = API_CONFIG.IOS_SIMULATOR;

// 3. If you're on a Physical Device:
// export const API_BASE_URL = API_CONFIG.PHYSICAL_DEVICE;

// 4. If you're on Expo Web:
// export const API_BASE_URL = API_CONFIG.WEB;

console.log('🌐 API configured to:', API_BASE_URL);
```

---

## Step 4: Test Backend Connection in App

### Add Debug Mode to Your App

I'll update your predictionService to add debug logging so you can see what's happening.

---

## Step 5: Verify Backend is Being Used

### Three Ways to Check:

#### Method 1: Check Console Logs
When you load the app, you should see:
```
✅ Backend API is available
📡 Using backend ML predictions
```

Instead of:
```
❌ Backend API failed, using mock data
```

#### Method 2: Check the Prices
- **Mock data** (hardcoded):
  - Corn: $4.22
  - Soybeans: $10.26
  - Wheat: $5.09

- **Backend data** (ML predictions):
  - Will vary based on your model
  - Should be different from mock values
  - Check backend terminal for prediction logs

#### Method 3: Check Backend Terminal
When app makes requests, you'll see in Flask terminal:
```
127.0.0.1 - - [15/Oct/2025 10:30:15] "GET /api/health HTTP/1.1" 200 -
127.0.0.1 - - [15/Oct/2025 10:30:16] "POST /api/predict/corn HTTP/1.1" 200 -
```

---

## Step 6: Common Issues & Solutions

### Issue 1: "Connection Refused" or "Network Error"
**Problem**: App can't reach backend
**Solutions**:
1. Check backend is running (`python app.py` in AgriTrader/backend/)
2. Verify you're using correct IP address
3. Check firewall isn't blocking port 5000
4. Make sure computer and device are on same WiFi network (for physical devices)

### Issue 2: CORS Errors
**Problem**: Backend rejects requests from app
**Solution**: Backend already has CORS enabled via `CORS(app)` in app.py ✅

### Issue 3: Still Getting Mock Data
**Problem**: App falls back to mock data
**Debug Steps**:
1. Check API_BASE_URL in config
2. Open API_BASE_URL in browser to verify it's accessible
3. Look at console logs for exact error message
4. Try pinging your backend: `ping YOUR_IP_ADDRESS`

### Issue 4: Backend Starts But Model Errors
**Problem**: Backend runs but can't make predictions
**Solution**:
1. Check backend terminal for Python errors
2. Verify model files exist in ML_PROJ root:
   - `agritrader_corn_model.pkl`
   - `agritrader_soybeans_model.pkl`
   - `agritrader_wheat_model.pkl`
3. Re-run model training if needed

---

## Complete Testing Workflow

### 1. Start Backend
```powershell
cd C:\Users\gmdid\ML_PROJ\AgriTrader\backend
python app.py
```

**Expected output:**
```
[STARTUP] Starting AgriTrader ML Backend...
[MODELS] Available models: ['corn', 'soybeans', 'wheat']
[API] Running on http://localhost:5000
[STATUS] Ready for React Native app!
```

### 2. Test Backend (in new terminal)
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET
```

### 3. Configure API URL
- Open `AgriTrader/lib/config.ts`
- Update with your IP address or correct setup
- Save file

### 4. Start React Native App
```powershell
cd C:\Users\gmdid\ML_PROJ\AgriTrader
npm start
# Then press 'a' for Android or 'i' for iOS
```

### 5. Watch Both Terminals
- **Backend terminal**: Should show incoming requests
- **App console**: Should show connection status

### 6. Verify in App
- Open Forecast screen
- Check if prices match backend predictions (not mock data)
- Pull to refresh to trigger new API call

---

## Success Indicators ✅

You know it's working when:
1. ✅ Backend terminal shows `POST /api/predict/corn 200`
2. ✅ App console shows `Using backend ML predictions`
3. ✅ Prices change when you refresh (not static)
4. ✅ Prices are different from mock values ($4.22, $10.26, $5.09)
5. ✅ Model confidence shows real values (not always 96%)

---

## Still Not Working?

Run this diagnostic script to test everything at once.
I'll create it in the next step.

---

## Quick Reference

| Setup | API URL to Use |
|-------|----------------|
| Android Emulator | `http://10.0.2.2:5000/api` |
| iOS Simulator | `http://localhost:5000/api` |
| Physical Device (same WiFi) | `http://YOUR_IP:5000/api` |
| Expo Web | `http://localhost:5000/api` |

**Remember**: Replace `YOUR_IP` with the actual IP from `ipconfig`!

