import { useUserProfile } from '../components/UserProfileContext';

// Types for our ML predictions
export interface PredictionData {
  crop: string;
  predicted_price: number;
  confidence_lower: number;
  confidence_upper: number;
  model_confidence: number;
  days_ahead: number;
  timestamp: string;
  location: string;
  recommendation: {
    action: string;
    confidence: string;
    confidence_percentage: number;
  };
  market_analysis: {
    trend: string;
    volatility: string;
    best_selling_time: string;
  };
}

export interface GraphDataPoint {
  days_ahead: number;
  predicted_price: number;
  confidence_lower: number;
  confidence_upper: number;
}

export interface GraphData {
  crop: string;
  location: string;
  data_points: GraphDataPoint[];
  current_price: number;
  trend: string;
  near_term_trend?: string;
  long_term_trend?: string;
  volatility: string;
  peak_price?: number;
  recommended_sell_time?: string;
}

// Backend API configuration
import { API_BASE_URL } from './config';

// For development, we'll use mock data that matches our ML model output
// In production, this would call your backend API with the ML models
class PredictionService {
  
  // ML MODEL PREDICTIONS - These are PREDICTIONS for TODAY and future!
  // Historical data (CSV): $4.18 corn on Oct 10 → Model predicts: $4.22 today
  // This shows the MODEL'S intelligence, not just historical data!
  private mockPredictions: Record<string, PredictionData> = {
    'corn': {
      crop: 'corn',
      predicted_price: 4.22,  // ML PREDICTION for today (CSV was $4.18 yesterday)
      confidence_lower: 4.04,
      confidence_upper: 4.40,
      model_confidence: 0.96,
      days_ahead: 1,
      timestamp: new Date().toISOString(),
      location: 'PA',
      recommendation: {
        action: 'Hold',
        confidence: 'High',
        confidence_percentage: 96
      },
      market_analysis: {
        trend: 'Slightly Bullish',
        volatility: 'Low',
        best_selling_time: 'Next 1-2 weeks'
      }
    },
    'soybeans': {
      crop: 'soybeans',
      predicted_price: 10.26,  // ML PREDICTION for today (CSV was $10.22 yesterday)
      confidence_lower: 10.04,
      confidence_upper: 10.48,
      model_confidence: 0.97,
      days_ahead: 1,
      timestamp: new Date().toISOString(),
      location: 'PA',
      recommendation: {
        action: 'Hold',
        confidence: 'High',
        confidence_percentage: 97
      },
      market_analysis: {
        trend: 'Slightly Bullish',
        volatility: 'Medium',
        best_selling_time: 'Within 1-2 weeks'
      }
    },
    'wheat': {
      crop: 'wheat',
      predicted_price: 5.09,  // ML PREDICTION for today (CSV was $5.06 yesterday)
      confidence_lower: 4.91,
      confidence_upper: 5.27,
      model_confidence: 0.93,
      days_ahead: 1,
      timestamp: new Date().toISOString(),
      location: 'PA',
      recommendation: {
        action: 'Hold',
        confidence: 'High',
        confidence_percentage: 93
      },
      market_analysis: {
        trend: 'Slightly Bullish',
        volatility: 'Low',
        best_selling_time: 'Next 2-3 weeks'
      }
    }
  };

  private mockGraphData: Record<string, GraphData> = {
    'corn': {
      crop: 'corn',
      location: 'PA',
      data_points: [
        { days_ahead: 1, predicted_price: 4.22, confidence_lower: 4.04, confidence_upper: 4.40 }, // Today: PREDICTION
        { days_ahead: 3, predicted_price: 4.25, confidence_lower: 4.07, confidence_upper: 4.43 }, // +3 days: PREDICTION
        { days_ahead: 7, predicted_price: 4.28, confidence_lower: 4.10, confidence_upper: 4.46 }, // +7 days: PREDICTION
        { days_ahead: 14, predicted_price: 4.32, confidence_lower: 4.14, confidence_upper: 4.50 }, // +14 days: PREDICTION
        { days_ahead: 30, predicted_price: 4.40, confidence_lower: 4.22, confidence_upper: 4.58 }  // +30 days: PREDICTION
      ],
      current_price: 4.18, // Last known CSV price (historical)
      trend: 'Slightly Bullish',
      volatility: 'Low'
    },
    'soybeans': {
      crop: 'soybeans',
      location: 'PA',
      data_points: [
        { days_ahead: 1, predicted_price: 10.26, confidence_lower: 10.04, confidence_upper: 10.48 }, // Today: PREDICTION
        { days_ahead: 3, predicted_price: 10.30, confidence_lower: 10.08, confidence_upper: 10.52 }, // +3 days: PREDICTION
        { days_ahead: 7, predicted_price: 10.34, confidence_lower: 10.12, confidence_upper: 10.56 }, // +7 days: PREDICTION
        { days_ahead: 14, predicted_price: 10.40, confidence_lower: 10.18, confidence_upper: 10.62 }, // +14 days: PREDICTION
        { days_ahead: 30, predicted_price: 10.53, confidence_lower: 10.31, confidence_upper: 10.75 }  // +30 days: PREDICTION
      ],
      current_price: 10.22, // Last known CSV price (historical)
      trend: 'Slightly Bullish',
      volatility: 'Medium'
    },
    'wheat': {
      crop: 'wheat',
      location: 'PA',
      data_points: [
        { days_ahead: 1, predicted_price: 5.09, confidence_lower: 4.91, confidence_upper: 5.27 }, // Today: PREDICTION
        { days_ahead: 3, predicted_price: 5.11, confidence_lower: 4.93, confidence_upper: 5.29 }, // +3 days: PREDICTION
        { days_ahead: 7, predicted_price: 5.14, confidence_lower: 4.96, confidence_upper: 5.32 }, // +7 days: PREDICTION
        { days_ahead: 14, predicted_price: 5.18, confidence_lower: 5.00, confidence_upper: 5.36 }, // +14 days: PREDICTION
        { days_ahead: 30, predicted_price: 5.26, confidence_lower: 5.08, confidence_upper: 5.44 }  // +30 days: PREDICTION
      ],
      current_price: 5.06, // Last known CSV price (historical)
      trend: 'Slightly Bullish',
      volatility: 'Low'
    }
  };

  // Check if backend API is available
  private async isBackendAvailable(): Promise<boolean> {
    try {
      console.log('🔍 Checking backend availability at:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend is available! Models loaded:', data.models_loaded);
        return true;
      } else {
        console.warn('⚠️ Backend responded but not OK:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('❌ Backend not available:', error);
      console.warn('💡 Using mock data as fallback');
      return false;
    }
  }

  // Get prediction for a specific crop and location
  async getPrediction(
    crop: string,
    location: string = 'PA',
    latitude?: number,
    longitude?: number,
  ): Promise<PredictionData> {
    // Try to use real ML API first, fallback to mock data
    const isBackendReady = await this.isBackendAvailable();
    
    if (isBackendReady) {
      try {
        console.log(`📡 Fetching ML prediction for ${crop} from backend...`);
        const response = await fetch(`${API_BASE_URL}/predict/${crop}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location: location,
            days: 1,
            lat: latitude,
            lon: longitude,
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Got ML prediction for ${crop}: $${data.predicted_price?.toFixed(2)}`);
          return data;
        } else {
          console.warn(`⚠️ Backend returned status ${response.status} for ${crop}`);
        }
      } catch (error) {
        console.warn('❌ Backend API request failed:', error);
      }
    }
    
    // Backend unavailable - throw error so user knows to start backend
    console.error(`❌ Backend is not running!`);
    console.error(`💡 To fix: Start backend with 'python app.py' in AgriTrader/backend/`);
    
    throw new Error('Backend server is not running. Please start the backend to get ML predictions.');
  }

  // Get graph data for chart display
  async getGraphData(crop: string, location: string = 'PA'): Promise<GraphData> {
    // Try to use real ML API first, fallback to mock data
    const isBackendReady = await this.isBackendAvailable();
    
    if (isBackendReady) {
      try {
        console.log(`📊 Fetching graph data for ${crop} from backend...`);
        const response = await fetch(`${API_BASE_URL}/predict/${crop}/graph`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location: location
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Got graph data for ${crop}`);
          return data;
        } else {
          console.warn(`⚠️ Backend returned status ${response.status} for ${crop} graph`);
        }
      } catch (error) {
        console.warn('❌ Backend graph request failed:', error);
      }
    }
    
    // Backend unavailable - throw error
    console.error(`❌ Backend is not running!`);
    console.error(`💡 To fix: Start backend with 'python app.py' in AgriTrader/backend/`);
    
    throw new Error('Backend server is not running. Please start the backend to get ML predictions.');
  }

  /**
   * Generate a deterministic "random" number based on a seed
   * This ensures the same historical pattern is generated each day
   */
  private seededRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  // Get historical prices for the "5 days ago" part of the chart
  // Uses REAL CSV data - NO MORE FAKE DATA!
  async getHistoricalPrices(crop: string, days: number = 5): Promise<number[]> {
    console.log('✅ Getting REAL historical prices for', crop, 'from CSV');
    
    // Import csvDataService dynamically to avoid circular imports
    const { csvDataService } = await import('./csvDataService');
    return csvDataService.getRecentPrices(crop, days);
  }

  // Refresh predictions (for pull-to-refresh functionality)
  async refreshPredictions(crop: string, location: string = 'PA'): Promise<{
    prediction: PredictionData;
    graphData: GraphData;
  }> {
    const [prediction, graphData] = await Promise.all([
      this.getPrediction(crop, location),
      this.getGraphData(crop, location)
    ]);

    return { prediction, graphData };
  }
}

// Export singleton instance
export const predictionService = new PredictionService();

// React hook for easy integration
export const usePredictions = (crop: string) => {
  const { profile } = useUserProfile();
  const location = profile?.location || 'PA';

  return {
    getPrediction: () => predictionService.getPrediction(crop, location),
    getGraphData: () => predictionService.getGraphData(crop, location),
    getHistoricalPrices: () => predictionService.getHistoricalPrices(crop),
    refreshPredictions: () => predictionService.refreshPredictions(crop, location),
    userLocation: location
  };
};
