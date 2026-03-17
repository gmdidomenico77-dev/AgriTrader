/**
 * Historical Data Service
 * Fetches real historical grain prices from your CSV data
 * Uses REAL data from NORMAL_VALS_ml_training_data.csv - NO MORE FAKE DATA!
 */

import { csvDataService } from './csvDataService';

export interface HistoricalPrice {
  date: string;
  price: number;
}

import { API_BASE_URL } from './config';

class HistoricalDataService {
  
  // Pennsylvania basis adjustments (vs CBOT)
  private PA_BASIS = {
    corn: -0.15,      // PA corn typically $0.15 below CBOT
    soybeans: -0.25,  // PA soybeans typically $0.25 below CBOT
    wheat: -0.20      // PA wheat typically $0.20 below CBOT
  };

  /**
   * Get historical prices for the past N days
   * Uses REAL data from your CSV - NO MORE FAKE DATA!
   */
  async getHistoricalPrices(
    crop: string, 
    days: number = 30,
    location: string = 'PA'
  ): Promise<HistoricalPrice[]> {
    try {
      // Try to fetch from backend first (if available)
      const response = await fetch(
        `${API_BASE_URL}/historical/${crop}?days=${days}&location=${location}`,
        { timeout: 2000 } as any
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Using backend CSV data for historical prices');
        return data.prices;
      }
    } catch (error) {
      console.log('⚠️ Backend unavailable for historical data, using local CSV data');
    }
    
    // Use REAL CSV data from your NORMAL_VALS_ml_training_data.csv
    console.log('✅ Using REAL CSV data for', crop, '- NO FAKE DATA!');
    return csvDataService.getHistoricalPrices(crop, days);
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

  /**
   * Generate realistic historical prices when API is unavailable
   * Based on actual market patterns and your ML training data
   */
  private generateHistoricalFallback(crop: string, days: number): HistoricalPrice[] {
    // Base prices from current market conditions (Oct 2025) - UPDATED!
    const currentPrices = {
      corn: 4.18,      // From your NORMAL_VALS CSV (Oct 10, 2025)
      soybeans: 10.22, // From your NORMAL_VALS CSV (Oct 10, 2025)
      wheat: 5.06      // From your NORMAL_VALS CSV (Oct 10, 2025)
    };
    
    // Historical volatility (daily standard deviation) - UPDATED for current prices
    const dailyVolatility = {
      corn: 0.05,      // ~$0.05/day typical movement (1.2% of $4.18)
      soybeans: 0.12,  // ~$0.12/day typical movement (1.2% of $10.22)
      wheat: 0.06      // ~$0.06/day typical movement (1.2% of $5.06)
    };
    
    const cropKey = crop.toLowerCase() as keyof typeof currentPrices;
    const currentPrice = currentPrices[cropKey] || 5.0;
    const volatility = dailyVolatility[cropKey] || 0.1;
    
    const prices: HistoricalPrice[] = [];
    const today = new Date();
    
    // Generate prices going backwards from today
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Create realistic price movement
      // Very slight trend over 30 days (prices relatively stable)
      const trendFactor = crop === 'soybeans' ? -0.001 : -0.0005; // Very small trends
      const trendEffect = i * trendFactor * currentPrice;
      
      // Add deterministic daily fluctuation (same pattern each day)
      const seed = new Date().toDateString() + crop.toLowerCase();
      const deterministicRandom = this.seededRandom(seed + i.toString());
      const randomWalk = (deterministicRandom - 0.5) * 2 * volatility;
      
      // Calculate price
      const price = currentPrice + trendEffect + randomWalk;
      
      prices.push({
        date: date.toISOString().split('T')[0],
        price: Number(Math.max(price, 0.1).toFixed(2))
      });
    }
    
    return prices;
  }

  /**
   * Get the most recent N prices for chart display
   * Uses REAL CSV data - NO MORE FAKE DATA!
   */
  async getRecentPrices(crop: string, count: number = 5): Promise<number[]> {
    console.log('✅ Getting REAL recent prices for', crop, 'from CSV');
    return csvDataService.getRecentPrices(crop, count);
  }

  /**
   * Get date labels for chart
   */
  getDateLabels(days: number = 5): string[] {
    const labels: string[] = [];
    const today = new Date();
    
    for (let i = days; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      if (i === days) {
        labels.push(`${i} days ago`);
      } else if (i === 1) {
        labels.push('Yesterday');
      } else {
        labels.push(`${i} days ago`);
      }
    }
    
    return labels;
  }

  /**
   * Calculate 30-day average price
   */
  async getAveragePrice(crop: string, days: number = 30): Promise<number> {
    const prices = await this.getHistoricalPrices(crop, days);
    const sum = prices.reduce((acc, p) => acc + p.price, 0);
    return Number((sum / prices.length).toFixed(2));
  }

  /**
   * Calculate price change percentage over period
   */
  async getPriceChange(crop: string, days: number = 30): Promise<number> {
    const prices = await this.getHistoricalPrices(crop, days);
    if (prices.length < 2) return 0;
    
    const oldPrice = prices[0].price;
    const newPrice = prices[prices.length - 1].price;
    
    return Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2));
  }
}

// Export singleton
export const historicalDataService = new HistoricalDataService();

// React hook for easy use
export const useHistoricalData = (crop: string) => {
  return {
    getHistoricalPrices: (days: number) => 
      historicalDataService.getHistoricalPrices(crop, days),
    getRecentPrices: (count: number) => 
      historicalDataService.getRecentPrices(crop, count),
    getAveragePrice: (days: number) => 
      historicalDataService.getAveragePrice(crop, days),
    getPriceChange: (days: number) => 
      historicalDataService.getPriceChange(crop, days)
  };
};
