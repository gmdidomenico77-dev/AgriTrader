/**
 * Market Prices Service
 * Local cash price comes from the backend (live USDA elevator bid when
 * available, else bundled CSV). National price is fetched live from the
 * backend's CBOT futures feed — NOT reconstructed from the local price,
 * since that reconstruction just reproduces whatever the local number
 * happened to be (which may be stale) rather than today's actual futures price.
 * The reconstruction is used only as a last-resort estimate when the app is
 * fully offline and running on the bundled CSV alone.
 */

import { csvDataService } from './csvDataService';
import { API_BASE_URL } from './config';

// Mirrors predictionService LOCATION_FACTORS — CSV data is PA-anchored so we ratio-adjust.
const LOCATION_FACTORS: Record<string, Record<string, number>> = {
  PA: { corn: 0.98, soybeans: 0.97, wheat: 0.99 },
  OH: { corn: 1.02, soybeans: 1.01, wheat: 1.00 },
  IN: { corn: 1.01, soybeans: 1.00, wheat: 0.98 },
  IL: { corn: 1.00, soybeans: 1.00, wheat: 1.00 },
};

function parseStateCode(location: string): string {
  if (!location) return 'PA';
  const s = location.trim().toUpperCase();
  const supported = Object.keys(LOCATION_FACTORS);
  if (supported.includes(s)) return s;
  const afterComma = s.split(',').pop()?.trim() ?? '';
  if (supported.includes(afterComma)) return afterComma;
  const nameMap: Record<string, string> = {
    PENNSYLVANIA: 'PA', OHIO: 'OH', INDIANA: 'IN', ILLINOIS: 'IL',
  };
  for (const [name, code] of Object.entries(nameMap)) {
    if (s.includes(name)) return code;
  }
  return 'PA';
}

function locationRatio(crop: string, stateCode: string): number {
  const paFactor = LOCATION_FACTORS['PA']?.[crop] ?? 1;
  const targetFactor = LOCATION_FACTORS[stateCode]?.[crop] ?? paFactor;
  return targetFactor / paFactor;
}

export interface CropPrice {
  crop: string;
  nationalPrice: number;
  localPrice: number;
  change: number;
  timestamp: string;
  /** True when the local price's underlying data is more than a few days old. */
  isStale: boolean;
  /** True when nationalPrice is a reconstructed estimate (basis math), not a live CBOT fetch. */
  nationalIsEstimated: boolean;
  /** Where the local price actually came from: 'usda_bid' | 'csv_data' | 'yahoo_finance'. */
  localSource?: string;
}

interface BackendCurrentPriceResponse {
  current_price?: number;
  local_price?: number;
  national_price?: number | null;
  local_price_source?: string;
  is_stale?: boolean;
  price_date?: string;
}

class MarketPricesService {
  private readonly PA_BASIS = {
    corn: -0.15,
    soybeans: -0.25,
    wheat: -0.2,
  };

  /**
   * @param lat, lon — when provided, the backend uses the same region-bucketed
   * USDA elevator bid as the ML prediction anchor, so this screen's "Local"
   * price always matches the Forecast screen's "Local Elevator Bid" card.
   */
  async getCurrentPrices(location: string = 'PA', lat?: number, lon?: number): Promise<CropPrice[]> {
    try {
      const crops = [
        { key: 'corn', label: 'Corn', basis: this.PA_BASIS.corn },
        { key: 'soybeans', label: 'Soybeans', basis: this.PA_BASIS.soybeans },
        { key: 'wheat', label: 'Wheat', basis: this.PA_BASIS.wheat },
      ] as const;

      const coordParams =
        Number.isFinite(lat) && Number.isFinite(lon) ? `&lat=${lat}&lon=${lon}` : '';

      // Prefer backend live/current values; if unavailable, fall back to bundled CSV.
      const liveRows = await Promise.all(
        crops.map(async (crop) => {
          try {
            const [currentRes, histRes] = await Promise.all([
              fetch(`${API_BASE_URL}/current/${crop.key}?location=${encodeURIComponent(location)}${coordParams}`),
              fetch(`${API_BASE_URL}/historical/${crop.key}?days=2&location=${encodeURIComponent(location)}`),
            ]);
            if (!currentRes.ok) return null;
            const currentData = (await currentRes.json()) as BackendCurrentPriceResponse;
            const histData = histRes.ok
              ? ((await histRes.json()) as { prices?: Array<{ price: number }> })
              : {};
            const localPrice = Number(currentData.local_price ?? currentData.current_price ?? 0);
            if (!Number.isFinite(localPrice) || localPrice <= 0) return null;

            const liveNational = currentData.national_price;
            const nationalIsEstimated = !(Number.isFinite(liveNational) && (liveNational as number) > 0);
            const nationalPrice = nationalIsEstimated
              ? Number((localPrice - crop.basis).toFixed(2))
              : Number((liveNational as number).toFixed(2));

            const prices = histData.prices ?? [];
            const prev = prices.length >= 2 ? prices[prices.length - 2]?.price : null;
            const change =
              prev && Number.isFinite(prev) && prev > 0
                ? Number((((localPrice - prev) / prev) * 100).toFixed(2))
                : 0;
            return {
              crop,
              localPrice,
              nationalPrice,
              nationalIsEstimated,
              change,
              isStale: !!currentData.is_stale,
              localSource: currentData.local_price_source,
            };
          } catch {
            return null;
          }
        }),
      );

      const hasCompleteLive = liveRows.every((row) => row !== null);
      if (hasCompleteLive) {
        const ts = new Date().toISOString();
        return liveRows
          .filter((row): row is NonNullable<typeof row> => row !== null)
          .map(({ crop, localPrice, nationalPrice, nationalIsEstimated, change, isStale, localSource }) => ({
            crop: crop.label,
            nationalPrice,
            localPrice: Number(localPrice.toFixed(2)),
            change,
            timestamp: ts,
            isStale,
            nationalIsEstimated,
            localSource,
          }));
      }

      const [corn, soy, wheat, chCorn, chSoy, chWheat] = await Promise.all([
        csvDataService.getLatestPrice('corn'),
        csvDataService.getLatestPrice('soybeans'),
        csvDataService.getLatestPrice('wheat'),
        csvDataService.getLatestDayChangePercent('corn'),
        csvDataService.getLatestDayChangePercent('soybeans'),
        csvDataService.getLatestDayChangePercent('wheat'),
      ]);

      if (!corn || !soy || !wheat) {
        console.warn('[marketPricesService] CSV prices missing, returning empty');
        return [];
      }

      // Apply location-specific adjustment so CSV fallback prices vary by region.
      const stateCode = parseStateCode(location);
      const adjCorn = Number((corn * locationRatio('corn', stateCode)).toFixed(2));
      const adjSoy = Number((soy * locationRatio('soybeans', stateCode)).toFixed(2));
      const adjWheat = Number((wheat * locationRatio('wheat', stateCode)).toFixed(2));

      // Fully offline: national is a reconstructed estimate and local is whatever
      // the bundled CSV last shipped with — both flagged so the UI can be honest.
      const national = (local: number, basis: number) =>
        Number((local - basis).toFixed(2));

      const ts = new Date().toISOString();
      return [
        {
          crop: 'Corn',
          nationalPrice: national(adjCorn, this.PA_BASIS.corn),
          localPrice: adjCorn,
          change: chCorn,
          timestamp: ts,
          isStale: true,
          nationalIsEstimated: true,
          localSource: 'bundled_csv',
        },
        {
          crop: 'Soybeans',
          nationalPrice: national(adjSoy, this.PA_BASIS.soybeans),
          localPrice: adjSoy,
          change: chSoy,
          timestamp: ts,
          isStale: true,
          nationalIsEstimated: true,
          localSource: 'bundled_csv',
        },
        {
          crop: 'Wheat',
          nationalPrice: national(adjWheat, this.PA_BASIS.wheat),
          localPrice: adjWheat,
          change: chWheat,
          timestamp: ts,
          isStale: true,
          nationalIsEstimated: true,
          localSource: 'bundled_csv',
        },
      ];
    } catch (error) {
      console.error('Error fetching market prices:', error);
      return [];
    }
  }

  async getCropPrice(crop: string): Promise<CropPrice | null> {
    const prices = await this.getCurrentPrices();
    return prices.find((p) => p.crop.toLowerCase() === crop.toLowerCase()) || null;
  }
}

export const marketPricesService = new MarketPricesService();
