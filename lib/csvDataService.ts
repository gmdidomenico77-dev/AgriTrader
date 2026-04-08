/**
 * CSV Data Service — loads bundled project root data.csv (Metro asset).
 */

import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

export interface HistoricalPrice {
  date: string;
  price: number;
}

export interface CSVParsedData {
  date: string;
  alt_corn_cash_price: number;
  alt_soybeans_cash_price: number;
  alt_wheat_cash_price: number;
}

// Bundled training CSV (metro.config: assetExts includes csv)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const trainingCsvAsset = require('../data.csv');

class CSVDataService {
  private data: CSVParsedData[] | null = null;
  private dataLoaded = false;
  private loadPromise: Promise<CSVParsedData[]> | null = null;

  private parseCSVText(text: string): CSVParsedData[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const header = lines[0].split(',');
    const idx = (name: string) => header.indexOf(name);
    const iDate = idx('date');
    const iCorn = idx('alt_corn_cash_price');
    const iSoy = idx('alt_soybeans_cash_price');
    const iWheat = idx('alt_wheat_cash_price');
    if (iDate < 0 || iCorn < 0 || iSoy < 0 || iWheat < 0) {
      console.error('[csvDataService] Missing expected columns in data.csv');
      return [];
    }

    const rows: CSVParsedData[] = [];
    for (let line = 1; line < lines.length; line++) {
      const cols = lines[line].split(',');
      if (cols.length <= Math.max(iDate, iCorn, iSoy, iWheat)) continue;

      const corn = parseFloat(cols[iCorn]);
      const soy = parseFloat(cols[iSoy]);
      const wheat = parseFloat(cols[iWheat]);
      if (!Number.isFinite(corn) || !Number.isFinite(soy) || !Number.isFinite(wheat)) continue;
      if (corn <= 0 || soy <= 0 || wheat <= 0) continue;

      rows.push({
        date: cols[iDate],
        alt_corn_cash_price: corn,
        alt_soybeans_cash_price: soy,
        alt_wheat_cash_price: wheat,
      });
    }
    return rows;
  }

  private async loadCSVData(): Promise<CSVParsedData[]> {
    if (this.dataLoaded && this.data) {
      return this.data;
    }

    try {
      const asset = Asset.fromModule(trainingCsvAsset);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      if (!uri) {
        throw new Error('CSV asset has no URI');
      }

      let text: string;
      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        text = await res.text();
      } else {
        text = await FileSystem.readAsStringAsync(uri);
      }

      const csvData = this.parseCSVText(text);
      this.data = csvData;
      this.dataLoaded = true;
      console.log('[csvDataService] Loaded data.csv:', csvData.length, 'rows');
      return csvData;
    } catch (error) {
      console.error('[csvDataService] Error loading CSV:', error);
      this.data = [];
      this.dataLoaded = true;
      return [];
    }
  }

  /** Single-flight load to avoid duplicate asset reads */
  private ensureLoaded(): Promise<CSVParsedData[]> {
    if (!this.loadPromise) {
      this.loadPromise = this.loadCSVData();
    }
    return this.loadPromise;
  }

  async getHistoricalPrices(crop: string, days: number = 5): Promise<HistoricalPrice[]> {
    const csvData = await this.ensureLoaded();

    const cropColumnMap: Record<string, keyof CSVParsedData> = {
      corn: 'alt_corn_cash_price',
      soybeans: 'alt_soybeans_cash_price',
      wheat: 'alt_wheat_cash_price',
    };

    const column = cropColumnMap[crop.toLowerCase()];
    if (!column) {
      console.error('[csvDataService] Unknown crop:', crop);
      return [];
    }

    const recentData = csvData.slice(-days);
    return recentData.map((row) => ({
      date: row.date,
      price: row[column] as number,
    }));
  }

  async getLatestPrice(crop: string): Promise<number> {
    const csvData = await this.ensureLoaded();

    const cropColumnMap: Record<string, keyof CSVParsedData> = {
      corn: 'alt_corn_cash_price',
      soybeans: 'alt_soybeans_cash_price',
      wheat: 'alt_wheat_cash_price',
    };

    const column = cropColumnMap[crop.toLowerCase()];
    if (!column || !csvData.length) {
      return 0;
    }

    const latestRecord = csvData[csvData.length - 1];
    return latestRecord[column] as number;
  }

  async getRecentPrices(crop: string, count: number = 5): Promise<number[]> {
    const historicalPrices = await this.getHistoricalPrices(crop, count);
    return historicalPrices.map((hp) => hp.price);
  }

  /**
   * Latest row cash prices (for market / alignment).
   */
  async getLatestRow(): Promise<CSVParsedData | null> {
    const csvData = await this.ensureLoaded();
    if (!csvData.length) return null;
    return csvData[csvData.length - 1];
  }

  /**
   * Day-over-day % change for a crop from the last two valid rows.
   */
  async getLatestDayChangePercent(crop: string): Promise<number> {
    const csvData = await this.ensureLoaded();
    if (csvData.length < 2) return 0;

    const cropColumnMap: Record<string, keyof CSVParsedData> = {
      corn: 'alt_corn_cash_price',
      soybeans: 'alt_soybeans_cash_price',
      wheat: 'alt_wheat_cash_price',
    };
    const column = cropColumnMap[crop.toLowerCase()];
    if (!column) return 0;

    const prev = csvData[csvData.length - 2][column] as number;
    const last = csvData[csvData.length - 1][column] as number;
    if (!Number.isFinite(prev) || prev <= 0) return 0;
    return Number((((last - prev) / prev) * 100).toFixed(2));
  }
}

export const csvDataService = new CSVDataService();
