/**
 * API Configuration for AgriTrader
 *
 * To connect to a deployed backend (fixes firewall / physical-device issues):
 *   1. Deploy backend via render.yaml → Render.com (free tier)
 *   2. Copy the service URL, e.g. https://agritrader-backend.onrender.com
 *   3. Set EXPO_PUBLIC_API_URL=https://agritrader-backend.onrender.com/api
 *      in a .env file at the repo root (Expo reads EXPO_PUBLIC_* vars automatically)
 *   4. Restart the Expo dev server
 *
 * Local development (laptop only, same machine):
 *   - iOS Simulator: http://localhost:5000/api  (default below)
 *   - Android Emulator: http://10.0.2.2:5000/api  (default below)
 *   - Physical device on same WiFi: http://<your-laptop-ip>:5000/api
 *     → requires Windows Firewall exception for port 5000, OR use the deployed URL above
 */

import { Platform } from 'react-native';

const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

const DEFAULT_NATIVE_API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'
    : 'http://localhost:5000/api';

export const API_BASE_URL =
  envApiUrl && envApiUrl.length > 0 ? envApiUrl : DEFAULT_NATIVE_API_URL;

export default API_BASE_URL;

