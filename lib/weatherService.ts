
import { geocodingService } from './geocodingService';

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  main: string; // Clear, Rain, Snow, etc.
  windSpeed: number;
  icon: string;
}

export interface WeatherAlert {
  type: 'severe' | 'warning' | 'info';
  title: string;
  description: string;
}

class WeatherService {
  /**
   * Get current weather for location
   * Uses user's profile coordinates if available, otherwise geocodes location string
   */
  async getCurrentWeather(location: string = 'PA', userLat?: number, userLon?: number): Promise<WeatherData | null> {
    try {
      // Use user's coordinates if provided (from profile)
      let lat: number;
      let lon: number;
      
      if (userLat !== undefined && userLon !== undefined) {
        // Use coordinates from user profile
        lat = userLat;
        lon = userLon;
        console.log(`[Weather API] Using user coordinates: (${lat}, ${lon})`);
      } else {
        // Geocode the location string to get coordinates
        const coords = geocodingService.getCoordinates(location);
        lat = coords.lat;
        lon = coords.lon;
        console.log(`[Weather API] Geocoded "${location}" to ${coords.city}, ${coords.state} (${lat}, ${lon})`);
      }
      
      // Use Open-Meteo API (FREE, no API key needed!)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`;
      
      console.log(`[Weather API] Calling Open-Meteo for location: ${location} (${lat}, ${lon})`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      const current = data.current;
      
      // Convert weather code to description
      const weatherCodes: { [key: number]: { main: string; description: string; icon: string } } = {
        0: { main: 'Clear', description: 'Clear sky', icon: '01d' },
        1: { main: 'Clear', description: 'Mainly clear', icon: '01d' },
        2: { main: 'Clouds', description: 'Partly cloudy', icon: '02d' },
        3: { main: 'Clouds', description: 'Overcast', icon: '03d' },
        45: { main: 'Fog', description: 'Fog', icon: '50d' },
        48: { main: 'Fog', description: 'Depositing rime fog', icon: '50d' },
        51: { main: 'Rain', description: 'Light drizzle', icon: '09d' },
        55: { main: 'Rain', description: 'Drizzle', icon: '09d' },
        61: { main: 'Rain', description: 'Light rain', icon: '10d' },
        65: { main: 'Rain', description: 'Rain', icon: '10d' },
        71: { main: 'Snow', description: 'Light snow', icon: '13d' },
        75: { main: 'Snow', description: 'Snow', icon: '13d' },
        80: { main: 'Rain', description: 'Light rain showers', icon: '09d' },
        85: { main: 'Snow', description: 'Light snow showers', icon: '13d' },
        95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
        96: { main: 'Thunderstorm', description: 'Thunderstorm with hail', icon: '11d' },
      };
      
      const weatherInfo = weatherCodes[current.weather_code] || { main: 'Clouds', description: 'Unknown', icon: '02d' };
      
      // Calculate feels like (simplified wind chill)
      const feelsLike = Math.round(current.temperature_2m - (current.wind_speed_10m * 0.1));
      
      const weather: WeatherData = {
        temp: Math.round(current.temperature_2m),
        feelsLike,
        humidity: Math.round(current.relative_humidity_2m),
        description: weatherInfo.description,
        main: weatherInfo.main,
        windSpeed: Math.round(current.wind_speed_10m),
        icon: weatherInfo.icon
      };
      
      console.log(`[Weather API] Success: ${weather.description} ${weather.temp}°F`);
      
      return weather;
    } catch (error) {
      console.error('Weather fetch error:', error);
      
      // Fallback to mock data on error
      return {
        temp: 58,
        feelsLike: 55,
        humidity: 72,
        description: 'Partly cloudy',
        main: 'Clouds',
        windSpeed: 8,
        icon: '02d'
      };
    }
  }

  /**
   * Check for weather alerts
   */
  async getWeatherAlerts(location: string = 'PA'): Promise<WeatherAlert[]> {
    try {
      const alerts: WeatherAlert[] = [];
      
      // For demo: Check current conditions and generate alerts
      const weather = await this.getCurrentWeather(location);
      
      if (weather) {
        // Heavy rain alert
        if (weather.main === 'Rain' || weather.description.toLowerCase().includes('storm')) {
          alerts.push({
            type: 'severe',
            title: 'Heavy Rain Expected',
            description: 'Storm system moving through. Delay field work and secure equipment.'
          });
        }
        
        // High wind alert
        if (weather.windSpeed > 15) {
          alerts.push({
            type: 'warning',
            title: 'High Wind Warning',
            description: 'Wind speeds above 15 mph. Monitor tall crops and secure loose items.'
          });
        }
        
        // Frost alert (if temp below 35°F)
        if (weather.temp < 35) {
          alerts.push({
            type: 'severe',
            title: 'Frost Warning',
            description: 'Temperatures near or below freezing. Protect sensitive crops.'
          });
        }
        
        // Perfect conditions
        if (weather.temp > 50 && weather.temp < 75 && weather.main === 'Clear') {
          alerts.push({
            type: 'info',
            title: 'Ideal Growing Conditions',
            description: 'Perfect weather for field work and crop growth.'
          });
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Weather alerts error:', error);
      return [];
    }
  }

  /**
   * Get forecast for next 5 days
   */
  async get5DayForecast(location: string = 'PA'): Promise<any[]> {
    // For demo purposes, return mock forecast
    return [
      { date: 'Mon', temp: 58, icon: '02d', description: 'Partly cloudy' },
      { date: 'Tue', temp: 61, icon: '01d', description: 'Sunny' },
      { date: 'Wed', temp: 55, icon: '10d', description: 'Light rain' },
      { date: 'Thu', temp: 59, icon: '02d', description: 'Partly cloudy' },
      { date: 'Fri', temp: 63, icon: '01d', description: 'Sunny' },
    ];
  }
}

export const weatherService = new WeatherService();

