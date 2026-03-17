/**
 * Geocoding Service - Convert location strings to coordinates
 * Uses a simple lookup for common locations, can be enhanced with a geocoding API
 */

interface LocationCoordinates {
  lat: number;
  lon: number;
  city: string;
  state?: string;
}

class GeocodingService {
  // Cache of known locations
  private locationMap: { [key: string]: LocationCoordinates } = {
    // Pennsylvania cities
    'pennsylvania': { lat: 40.2737, lon: -76.8844, city: 'Harrisburg', state: 'PA' },
    'pa': { lat: 40.2737, lon: -76.8844, city: 'Harrisburg', state: 'PA' },
    'harrisburg': { lat: 40.2737, lon: -76.8844, city: 'Harrisburg', state: 'PA' },
    'pittsburgh': { lat: 40.4406, lon: -79.9959, city: 'Pittsburgh', state: 'PA' },
    'philadelphia': { lat: 39.9526, lon: -75.1652, city: 'Philadelphia', state: 'PA' },
    'lancaster': { lat: 40.0379, lon: -76.3055, city: 'Lancaster', state: 'PA' },
    'state college': { lat: 40.7982, lon: -77.8599, city: 'State College', state: 'PA' },
    
    // Ohio
    'ohio': { lat: 39.9612, lon: -82.9988, city: 'Columbus', state: 'OH' },
    'oh': { lat: 39.9612, lon: -82.9988, city: 'Columbus', state: 'OH' },
    'columbus': { lat: 39.9612, lon: -82.9988, city: 'Columbus', state: 'OH' },
    'cleveland': { lat: 41.4993, lon: -81.6944, city: 'Cleveland', state: 'OH' },
    'cincinnati': { lat: 39.1031, lon: -84.5120, city: 'Cincinnati', state: 'OH' },
    
    // Indiana
    'indiana': { lat: 39.7684, lon: -86.1581, city: 'Indianapolis', state: 'IN' },
    'in': { lat: 39.7684, lon: -86.1581, city: 'Indianapolis', state: 'IN' },
    'indianapolis': { lat: 39.7684, lon: -86.1581, city: 'Indianapolis', state: 'IN' },
    
    // Illinois
    'illinois': { lat: 39.7817, lon: -89.6501, city: 'Springfield', state: 'IL' },
    'il': { lat: 39.7817, lon: -89.6501, city: 'Springfield', state: 'IL' },
    'springfield': { lat: 39.7817, lon: -89.6501, city: 'Springfield', state: 'IL' },
    'chicago': { lat: 41.8781, lon: -87.6298, city: 'Chicago', state: 'IL' },
  };

  /**
   * Get coordinates from location string
   * Returns Harrisburg, PA as default if not found
   */
  getCoordinates(location: string): LocationCoordinates {
    const normalized = location.toLowerCase().trim();
    
    // Check for exact match first
    if (this.locationMap[normalized]) {
      return this.locationMap[normalized];
    }
    
    // Check for partial matches
    for (const [key, coords] of Object.entries(this.locationMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return coords;
      }
    }
    
    // Default to Harrisburg, PA
    console.log(`[Geocoding] Location "${location}" not found, defaulting to Harrisburg, PA`);
    return this.locationMap['harrisburg'];
  }

  /**
   * Add a new location to the map
   */
  addLocation(name: string, lat: number, lon: number, city: string, state?: string) {
    this.locationMap[name.toLowerCase()] = { lat, lon, city, state };
  }

  /**
   * Get all available locations
   */
  getAvailableLocations(): string[] {
    return Object.keys(this.locationMap);
  }
}

export const geocodingService = new GeocodingService();

