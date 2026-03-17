/**
 * API Configuration for AgriTrader
 * 
 * IMPORTANT: Update this based on where you're running the app!
 */

import { Platform } from 'react-native';

// API base URL selection
// - For web / Vercel: set EXPO_PUBLIC_API_URL in the environment
// - For native: fall back to sensible defaults if EXPO_PUBLIC_API_URL is not set
const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

const DEFAULT_NATIVE_API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'
    : 'http://localhost:5000/api';

export const API_BASE_URL = envApiUrl && envApiUrl.length > 0
  ? envApiUrl
  : DEFAULT_NATIVE_API_URL;

// Debug logging
console.log('🌐 API Base URL configured:', API_BASE_URL);
console.log('📱 Platform:', Platform.OS);

// Test connectivity helper
export async function testBackendConnection(): Promise<{
  success: boolean;
  message: string;
  url: string;
}> {
  const healthUrl = `${API_BASE_URL}/health`.replace('/api/api', '/api');
  
  try {
    console.log('🔍 Testing backend connection to:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      const message = `✅ Backend connected! Models loaded: ${data.models_loaded}`;
      console.log(message);
      return {
        success: true,
        message,
        url: healthUrl
      };
    } else {
      const message = `❌ Backend responded with status: ${response.status}`;
      console.warn(message);
      return {
        success: false,
        message,
        url: healthUrl
      };
    }
  } catch (error) {
    const message = `❌ Cannot reach backend: ${error}`;
    console.error(message);
    console.error('💡 Possible fixes:');
    console.error('   1. Check if backend is running (python app.py)');
    console.error('   2. Verify API_BASE_URL in config.ts matches your setup');
    console.error('   3. If using Android emulator, use http://10.0.2.2:5000/api');
    console.error('   4. If using physical device, use your computer\'s IP address');
    
    return {
      success: false,
      message,
      url: healthUrl
    };
  }
}

// Export for backward compatibility
export default API_BASE_URL;

