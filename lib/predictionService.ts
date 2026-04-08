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
  fallback_used?: boolean;
  local_bid?: number;
  local_bid_region?: string;
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

/**
 * Location-specific price adjustment factors (mirrors Python backend location_factors).
 * PA is the training-data baseline.  Other states adjust up/down by crop.
 */
const LOCATION_FACTORS: Record<string, Record<string, number>> = {
  PA: { corn: 0.98, soybeans: 0.97, wheat: 0.99 },
  OH: { corn: 1.02, soybeans: 1.01, wheat: 1.00 },
  IN: { corn: 1.01, soybeans: 1.00, wheat: 0.98 },
  IL: { corn: 1.00, soybeans: 1.00, wheat: 1.00 },
};

/** Extract supported 2-letter state code from any location string, defaulting to 'PA'. */
function parseStateCode(location: string): string {
  if (!location) return 'PA';
  const s = location.trim().toUpperCase();
  const supported = Object.keys(LOCATION_FACTORS);
  // Exact match
  if (supported.includes(s)) return s;
  // "City, ST" → pull the part after the last comma
  const afterComma = s.split(',').pop()?.trim() ?? '';
  if (supported.includes(afterComma)) return afterComma;
  // Full state names
  const nameMap: Record<string, string> = {
    PENNSYLVANIA: 'PA', OHIO: 'OH', INDIANA: 'IN', ILLINOIS: 'IL',
  };
  for (const [name, code] of Object.entries(nameMap)) {
    if (s.includes(name)) return code;
  }
  return 'PA';
}

// For development, we'll use mock data that matches our ML model output
// In production, this would call your backend API with the ML models
class PredictionService {
  /** Bundled demo anchors (must match mockGraphData `current_price` per crop) for CSV scaling */
  private readonly MOCK_CASH_ANCHOR: Record<string, number> = {
    corn: 4.18,
    soybeans: 10.22,
    wheat: 5.06,
  };

  /**
   * The bundled mock data was built for 'PA' location factors (0.98 corn, 0.97 soy, 0.99 wheat).
   * When used for a different state, undo the PA factor and apply the target state factor.
   */
  private locationRatio(crop: string, stateCode: string): number {
    const paFactor = LOCATION_FACTORS['PA']?.[crop] ?? 1;
    const targetFactor = LOCATION_FACTORS[stateCode]?.[crop] ?? paFactor;
    return targetFactor / paFactor;
  }

  private backendCheckedAt = 0;
  private backendAvailableCache: boolean | null = null;
  private static readonly BACKEND_CHECK_TTL_MS = 20_000;

  private mockPredictions: Record<string, PredictionData> = {
    'corn': {
      crop: 'corn',
      predicted_price: 4.22,
      confidence_lower: 4.04,
      confidence_upper: 4.40,
      model_confidence: 0.96,
      days_ahead: 1,
      timestamp: new Date().toISOString(),
      location: 'PA',
      fallback_used: true,
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
      predicted_price: 10.26,
      confidence_lower: 10.04,
      confidence_upper: 10.48,
      model_confidence: 0.97,
      days_ahead: 1,
      timestamp: new Date().toISOString(),
      location: 'PA',
      fallback_used: true,
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
      predicted_price: 5.09,
      confidence_lower: 4.91,
      confidence_upper: 5.27,
      model_confidence: 0.93,
      days_ahead: 1,
      timestamp: new Date().toISOString(),
      location: 'PA',
      fallback_used: true,
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

  private async isBackendAvailable(): Promise<boolean> {
    const now = Date.now();
    if (
      this.backendAvailableCache !== null &&
      now - this.backendCheckedAt < PredictionService.BACKEND_CHECK_TTL_MS
    ) {
      return this.backendAvailableCache;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000); // fail fast — don't wait 20s for TCP timeout

    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      this.backendAvailableCache = response.ok;
      this.backendCheckedAt = now;
      return response.ok;
    } catch {
      clearTimeout(timer);
      this.backendAvailableCache = false;
      this.backendCheckedAt = now;
      return false;
    }
  }

  private trendLabelFromSeries(prices: number[]): string {
    if (prices.length < 2) return 'Stable';
    const first = prices[0];
    const last = prices[prices.length - 1];
    if (last > first * 1.008) return 'Upward';
    if (last < first * 0.992) return 'Downward';
    return 'Stable';
  }

  private enrichGraphData(g: GraphData): GraphData {
    const pts = g.data_points;
    if (!pts.length) return g;
    const prices = pts.map((p) => p.predicted_price);
    const mid = prices[Math.floor(prices.length / 2)];
    const first = prices[0];
    const last = prices[prices.length - 1];
    const peak = Math.max(...prices, g.current_price ?? 0);
    const nearTerm = this.trendLabelFromSeries(prices);
    const longTerm =
      last > mid * 1.01 ? 'Upward' : last < mid * 0.99 ? 'Downward' : 'Stable';
    return {
      ...g,
      peak_price: g.peak_price ?? peak,
      near_term_trend: g.near_term_trend ?? nearTerm,
      long_term_trend: g.long_term_trend ?? longTerm,
    };
  }

  private scalePrediction(p: PredictionData, ratio: number): PredictionData {
    if (ratio === 1) return { ...p };
    return {
      ...p,
      predicted_price: Number((p.predicted_price * ratio).toFixed(2)),
      confidence_lower: Number((p.confidence_lower * ratio).toFixed(2)),
      confidence_upper: Number((p.confidence_upper * ratio).toFixed(2)),
    };
  }

  private scaleGraphData(g: GraphData, ratio: number): GraphData {
    if (ratio === 1) return { ...g };
    return {
      ...g,
      current_price: Number((g.current_price * ratio).toFixed(3)),
      data_points: g.data_points.map((p) => ({
        ...p,
        predicted_price: Number((p.predicted_price * ratio).toFixed(3)),
        confidence_lower: Number((p.confidence_lower * ratio).toFixed(3)),
        confidence_upper: Number((p.confidence_upper * ratio).toFixed(3)),
      })),
      peak_price: g.peak_price !== undefined ? Number((g.peak_price * ratio).toFixed(3)) : undefined,
    };
  }

  /** Offline-only: scaled bundled data aligned to latest cash prices in data.csv */
  private async getBundledPrediction(crop: string, location: string): Promise<PredictionData> {
    const key = crop.toLowerCase();
    const base = this.mockPredictions[key];
    if (!base) {
      throw new Error(`No bundled prediction for crop: ${crop}`);
    }
    const { csvDataService } = await import('./csvDataService');
    const latest = await csvDataService.getLatestPrice(key);
    const anchor = this.MOCK_CASH_ANCHOR[key] ?? base.predicted_price;
    // Scale to latest CSV cash price, then adjust for the user's state
    const csvRatio = latest > 0 && anchor > 0 ? latest / anchor : 1;
    const stateCode = parseStateCode(location);
    const locRatio = this.locationRatio(key, stateCode);
    const totalRatio = csvRatio * locRatio;

    const scaled = this.scalePrediction({ ...base, location }, totalRatio);
    scaled.timestamp = new Date().toISOString();

    const graph = this.mockGraphData[key];
    const series = graph
      ? this.scaleGraphData({ ...graph, location }, totalRatio).data_points.map((p) => p.predicted_price)
      : [scaled.predicted_price];
    const trend = this.trendLabelFromSeries(series);
    return {
      ...scaled,
      market_analysis: {
        ...scaled.market_analysis,
        trend,
      },
    };
  }

  private async getBundledGraphData(crop: string, location: string): Promise<GraphData> {
    const key = crop.toLowerCase();
    const base = this.mockGraphData[key];
    if (!base) {
      throw new Error(`No bundled graph for crop: ${crop}`);
    }
    const { csvDataService } = await import('./csvDataService');
    const latest = await csvDataService.getLatestPrice(key);
    const anchor = this.MOCK_CASH_ANCHOR[key] ?? base.current_price;
    const csvRatio = latest > 0 && anchor > 0 ? latest / anchor : 1;
    const stateCode = parseStateCode(location);
    const locRatio = this.locationRatio(key, stateCode);
    const scaled = this.scaleGraphData({ ...base, location }, csvRatio * locRatio);
    return this.enrichGraphData(scaled);
  }

  // Get prediction for a specific crop and location
  async getPrediction(
    crop: string,
    location: string = 'PA',
    latitude?: number,
    longitude?: number,
  ): Promise<PredictionData> {
    const isBackendReady = await this.isBackendAvailable();

    if (isBackendReady) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000); // models can be slow on cold start
      try {
        const response = await fetch(`${API_BASE_URL}/predict/${crop}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location, days: 1, lat: latitude, lon: longitude }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) {
          const data = await response.json();
          data.fallback_used = data.diagnostics?.fallback_used ?? false;
          return data as PredictionData;
        }
      } catch {
        clearTimeout(timer);
        // backend unreachable or timed out — fall through to bundled
      }
    }

    return this.getBundledPrediction(crop, location);
  }

  // Get graph data for chart display
  async getGraphData(
    crop: string,
    location: string = 'PA',
    latitude?: number,
    longitude?: number,
  ): Promise<GraphData> {
    const isBackendReady = await this.isBackendAvailable();

    if (isBackendReady) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${API_BASE_URL}/predict/${crop}/graph`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location, lat: latitude, lon: longitude }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) {
          const data = (await response.json()) as GraphData;
          return this.enrichGraphData(data);
        }
      } catch {
        clearTimeout(timer);
      }
    }

    return this.getBundledGraphData(crop, location);
  }

  async getHistoricalPrices(crop: string, days: number = 5): Promise<number[]> {
    const { csvDataService } = await import('./csvDataService');
    return csvDataService.getRecentPrices(crop, days);
  }

  // Refresh predictions (for pull-to-refresh functionality)
  async refreshPredictions(
    crop: string,
    location: string = 'PA',
    latitude?: number,
    longitude?: number,
  ): Promise<{
    prediction: PredictionData;
    graphData: GraphData;
  }> {
    const [prediction, graphData] = await Promise.all([
      this.getPrediction(crop, location, latitude, longitude),
      this.getGraphData(crop, location, latitude, longitude)
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
    getGraphData: () => predictionService.getGraphData(crop, location, profile?.latitude, profile?.longitude),
    getHistoricalPrices: () => predictionService.getHistoricalPrices(crop),
    refreshPredictions: () => predictionService.refreshPredictions(crop, location, profile?.latitude, profile?.longitude),
    userLocation: location
  };
};
