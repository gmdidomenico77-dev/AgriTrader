/**
 * Market Prices Service
 * Fetches CBOT futures and local bids
 * Uses Yahoo Finance for CBOT (no backend needed)
 */

export interface CropPrice {
  crop: string;
  nationalPrice: number; // CBOT futures
  localPrice: number; // Local bids (estimated from national)
  change: number; // % change from yesterday
  timestamp: string;
}

class MarketPricesService {
  // PA basis adjustments (local prices vs national)
  private readonly PA_BASIS = {
    corn: -0.15,      // PA corn typically $0.15 below CBOT
    soybeans: -0.25,  // PA soybeans typically $0.25 below CBOT
    wheat: -0.20      // PA wheat typically $0.20 below CBOT
  };

  /**
   * Get current market prices (CBOT + Local estimates)
   * For demo, uses recent CBOT values
   */
  async getCurrentPrices(): Promise<CropPrice[]> {
    try {
      // For demo purposes, use recent CBOT futures prices
      // In production, fetch from Yahoo Finance API
      
      const cbotPrices = {
        corn: 4.12,      // Current CBOT corn futures ($/bu)
        soybeans: 10.25, // Current CBOT soybean futures ($/bu)
        wheat: 5.00      // Current CBOT wheat futures ($/bu)
      };

      const prices: CropPrice[] = [
        {
          crop: 'Corn',
          nationalPrice: cbotPrices.corn,
          localPrice: cbotPrices.corn + this.PA_BASIS.corn,
          change: +0.5, // Mock % change
          timestamp: new Date().toISOString()
        },
        {
          crop: 'Soybeans',
          nationalPrice: cbotPrices.soybeans,
          localPrice: cbotPrices.soybeans + this.PA_BASIS.soybeans,
          change: -0.3,
          timestamp: new Date().toISOString()
        },
        {
          crop: 'Wheat',
          nationalPrice: cbotPrices.wheat,
          localPrice: cbotPrices.wheat + this.PA_BASIS.wheat,
          change: +1.2,
          timestamp: new Date().toISOString()
        }
      ];

      return prices;
    } catch (error) {
      console.error('Error fetching market prices:', error);
      return [];
    }
  }

  /**
   * Get price for specific crop
   */
  async getCropPrice(crop: string): Promise<CropPrice | null> {
    const prices = await this.getCurrentPrices();
    return prices.find(p => p.crop.toLowerCase() === crop.toLowerCase()) || null;
  }
}

export const marketPricesService = new MarketPricesService();

