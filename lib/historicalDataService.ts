/**
 * Historical Data Service
 * Prefers backend /historical when available; otherwise uses bundled data.csv via csvDataService.
 */

import { csvDataService } from './csvDataService';
import { API_BASE_URL } from './config';

export interface HistoricalPrice {
  date: string;
  price: number;
}

class HistoricalDataService {
  /**
   * Get historical prices for the past N days
   */
  async getHistoricalPrices(
    crop: string,
    days: number = 30,
    location: string = 'PA',
  ): Promise<HistoricalPrice[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(
        `${API_BASE_URL}/historical/${crop}?days=${days}&location=${encodeURIComponent(location)}`,
        { signal: controller.signal },
      );
      clearTimeout(timer);
      if (response.ok) {
        const data = (await response.json()) as { prices?: HistoricalPrice[] };
        if (Array.isArray(data.prices) && data.prices.length > 0) {
          return data.prices;
        }
      }
    } catch {
      clearTimeout(timer);
    }

    return csvDataService.getHistoricalPrices(crop, days);
  }

  async getRecentPrices(crop: string, count: number = 5): Promise<number[]> {
    return csvDataService.getRecentPrices(crop, count);
  }

  getDateLabels(days: number = 5): string[] {
    const labels: string[] = [];
    for (let i = days; i > 0; i--) {
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

  async getAveragePrice(crop: string, days: number = 30): Promise<number> {
    const prices = await this.getHistoricalPrices(crop, days);
    if (!prices.length) return 0;
    const sum = prices.reduce((acc, p) => acc + p.price, 0);
    return Number((sum / prices.length).toFixed(2));
  }

  async getPriceChange(crop: string, days: number = 30): Promise<number> {
    const prices = await this.getHistoricalPrices(crop, days);
    if (prices.length < 2) return 0;

    const oldPrice = prices[0].price;
    const newPrice = prices[prices.length - 1].price;

    return Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2));
  }
}

export const historicalDataService = new HistoricalDataService();

export const useHistoricalData = (crop: string) => {
  return {
    getHistoricalPrices: (days: number) => historicalDataService.getHistoricalPrices(crop, days),
    getRecentPrices: (count: number) => historicalDataService.getRecentPrices(crop, count),
    getAveragePrice: (days: number) => historicalDataService.getAveragePrice(crop, days),
    getPriceChange: (days: number) => historicalDataService.getPriceChange(crop, days),
  };
};
