/**
 * Bundled Prediction Service
 * Uses pre-computed predictions from JSON file
 * NO BACKEND REQUIRED!
 * 
 * This is the fallback when backend is unavailable or for production use
 */

import bundledPredictions from '../assets/bundled_predictions.json';
import { PredictionData, GraphData } from './predictionService';

class BundledPredictionService {
  private predictions: any;

  constructor() {
    this.predictions = bundledPredictions;
    console.log('📦 Loaded bundled predictions from:', this.predictions.generated_at);
  }

  /**
   * Get prediction from bundled data
   */
  getPrediction(crop: string, location: string = 'PA'): PredictionData {
    const cropKey = crop.toLowerCase();
    const locationKey = location.toUpperCase();

    if (this.predictions.predictions[cropKey]?.[locationKey]?.prediction) {
      const prediction = this.predictions.predictions[cropKey][locationKey].prediction;
      console.log(`📦 Using bundled prediction for ${crop} (${location}): $${prediction.predicted_price?.toFixed(2)}`);
      return prediction;
    }

    throw new Error(`No bundled prediction for ${crop} in ${location}`);
  }

  /**
   * Get graph data from bundled data
   */
  getGraphData(crop: string, location: string = 'PA'): GraphData {
    const cropKey = crop.toLowerCase();
    const locationKey = location.toUpperCase();

    if (this.predictions.predictions[cropKey]?.[locationKey]?.graph) {
      const graph = this.predictions.predictions[cropKey][locationKey].graph;
      console.log(`📦 Using bundled graph data for ${crop} (${location})`);
      return graph;
    }

    throw new Error(`No bundled graph data for ${crop} in ${location}`);
  }

  /**
   * Check how old the bundled predictions are
   */
  getAge(): { hours: number; isStale: boolean; generatedAt: string } {
    const generatedAt = new Date(this.predictions.generated_at);
    const now = new Date();
    const hours = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60);

    return {
      hours: Math.round(hours),
      isStale: hours > 24, // Consider stale if older than 24 hours
      generatedAt: this.predictions.generated_at
    };
  }
}

// Export singleton
export const bundledPredictionService = new BundledPredictionService();

