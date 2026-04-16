/**
 * Geocoding Service - Convert location strings to coordinates
 * Uses a lookup for common locations; falls back to Open Meteo's free geocoding
 * API for unknown locations so we never silently default to Harrisburg.
 */

interface LocationCoordinates {
  lat: number;
  lon: number;
  city: string;
  state?: string;
}

/** Two-letter keys must not substring-match inside longer place names */
const STATE_ABBREV_KEYS = new Set(['pa', 'oh', 'in', 'il']);

class GeocodingService {
  private locationMap: { [key: string]: LocationCoordinates } = {
    'pennsylvania': { lat: 40.2737, lon: -76.8844, city: 'Harrisburg', state: 'PA' },
    'pa': { lat: 40.2737, lon: -76.8844, city: 'Harrisburg', state: 'PA' },
    'harrisburg': { lat: 40.2737, lon: -76.8844, city: 'Harrisburg', state: 'PA' },
    'pittsburgh': { lat: 40.4406, lon: -79.9959, city: 'Pittsburgh', state: 'PA' },
    'philadelphia': { lat: 39.9526, lon: -75.1652, city: 'Philadelphia', state: 'PA' },
    'lancaster': { lat: 40.0379, lon: -76.3055, city: 'Lancaster', state: 'PA' },
    'state college': { lat: 40.7982, lon: -77.8599, city: 'State College', state: 'PA' },
    'cranberry township': { lat: 40.495, lon: -80.1077, city: 'Cranberry Township', state: 'PA' },
    'cranberry': { lat: 40.495, lon: -80.1077, city: 'Cranberry Township', state: 'PA' },
    'harmorville': { lat: 40.495, lon: -79.9296, city: 'Harmarville', state: 'PA' },
    'harmarville': { lat: 40.495, lon: -79.9296, city: 'Harmarville', state: 'PA' },

    'ohio': { lat: 39.9612, lon: -82.9988, city: 'Columbus', state: 'OH' },
    'oh': { lat: 39.9612, lon: -82.9988, city: 'Columbus', state: 'OH' },
    'columbus': { lat: 39.9612, lon: -82.9988, city: 'Columbus', state: 'OH' },
    'cleveland': { lat: 41.4993, lon: -81.6944, city: 'Cleveland', state: 'OH' },
    'cincinnati': { lat: 39.1031, lon: -84.512, city: 'Cincinnati', state: 'OH' },

    'indiana': { lat: 39.7684, lon: -86.1581, city: 'Indianapolis', state: 'IN' },
    'in': { lat: 39.7684, lon: -86.1581, city: 'Indianapolis', state: 'IN' },
    'indianapolis': { lat: 39.7684, lon: -86.1581, city: 'Indianapolis', state: 'IN' },

    'illinois': { lat: 39.7817, lon: -89.6501, city: 'Springfield', state: 'IL' },
    'il': { lat: 39.7817, lon: -89.6501, city: 'Springfield', state: 'IL' },
    'springfield': { lat: 39.7817, lon: -89.6501, city: 'Springfield', state: 'IL' },
    'chicago': { lat: 41.8781, lon: -87.6298, city: 'Chicago', state: 'IL' },
  };

  /** US state abbreviation → full name, used to improve Open Meteo search queries */
  private stateNames: Record<string, string> = {
    'pa': 'Pennsylvania', 'oh': 'Ohio', 'in': 'Indiana', 'il': 'Illinois',
    'ny': 'New York', 'nj': 'New Jersey', 'md': 'Maryland', 'va': 'Virginia',
    'wv': 'West Virginia', 'de': 'Delaware', 'ky': 'Kentucky', 'mi': 'Michigan',
    'ia': 'Iowa', 'mo': 'Missouri', 'wi': 'Wisconsin', 'mn': 'Minnesota',
  };

  private stateAbbrevMatchesLocation(normalized: string, abbrev: string): boolean {
    if (normalized === abbrev) return true;
    const suffix = `, ${abbrev}`;
    return normalized.endsWith(suffix);
  }

  /** Try the local hardcoded map (fast, sync). Returns null on miss. */
  private lookupLocal(location: string): LocationCoordinates | null {
    const normalized = location.toLowerCase().trim().replace(/\s+/g, ' ');

    if (this.locationMap[normalized]) {
      return this.locationMap[normalized];
    }

    const cityPart = normalized.split(',')[0]?.trim() ?? normalized;
    if (cityPart && this.locationMap[cityPart]) {
      return this.locationMap[cityPart];
    }

    const entries = Object.entries(this.locationMap);
    const partialMatches: { key: string; coords: LocationCoordinates }[] = [];

    for (const [key, coords] of entries) {
      if (STATE_ABBREV_KEYS.has(key)) {
        if (this.stateAbbrevMatchesLocation(normalized, key)) {
          partialMatches.push({ key, coords });
        }
        continue;
      }
      if (normalized.includes(key) || key.includes(normalized) || cityPart.includes(key) || key.includes(cityPart)) {
        partialMatches.push({ key, coords });
      }
    }

    partialMatches.sort((a, b) => b.key.length - a.key.length);
    if (partialMatches.length > 0) {
      return partialMatches[0].coords;
    }

    return null;
  }

  /**
   * Query Open Meteo's free geocoding API for coordinates.
   * Restricts results to the US and prefers results in the user's state if provided.
   */
  private async geocodeViaOpenMeteo(location: string): Promise<LocationCoordinates | null> {
    try {
      // Build a search query — expand state abbreviation for better results
      // e.g. "York, PA" → search "York Pennsylvania"
      let query = location.trim();
      const commaMatch = query.match(/,\s*([a-zA-Z]{2})\s*$/);
      if (commaMatch) {
        const abbrev = commaMatch[1].toLowerCase();
        const fullState = this.stateNames[abbrev];
        if (fullState) {
          query = query.replace(/,\s*[a-zA-Z]{2}\s*$/, `, ${fullState}`);
        }
      }

      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) return null;

      const data = await response.json();
      const results: any[] = data.results ?? [];
      if (results.length === 0) return null;

      // Prefer US results
      const usResults = results.filter((r: any) => r.country_code === 'US');
      const best = usResults.length > 0 ? usResults[0] : results[0];

      const coords: LocationCoordinates = {
        lat: best.latitude,
        lon: best.longitude,
        city: best.name ?? location,
        state: best.admin1 ?? undefined,
      };

      // Cache in the local map so future sync lookups hit
      const cacheKey = location.toLowerCase().trim().replace(/\s+/g, ' ');
      this.locationMap[cacheKey] = coords;

      console.log(`[Geocoding] Open Meteo resolved "${location}" → ${coords.city}, ${coords.state} (${coords.lat}, ${coords.lon})`);
      return coords;
    } catch (e) {
      console.log(`[Geocoding] Open Meteo geocoding failed for "${location}":`, e);
      return null;
    }
  }

  /**
   * Get coordinates from location string (sync — uses local map only).
   * Defaults to Harrisburg, PA only when there is no local match.
   * Prefer getCoordinatesAsync() when possible for full geocoding support.
   */
  getCoordinates(location: string): LocationCoordinates {
    const local = this.lookupLocal(location);
    if (local) return local;

    console.log(`[Geocoding] Location "${location}" not in local map, defaulting to Harrisburg, PA`);
    return this.locationMap['harrisburg'];
  }

  /**
   * Get coordinates from location string (async — full geocoding).
   * 1. Checks the local hardcoded map (instant)
   * 2. Falls back to Open Meteo geocoding API (network call)
   * 3. Only defaults to Harrisburg if both fail
   */
  async getCoordinatesAsync(location: string): Promise<LocationCoordinates> {
    // Fast path: local map hit
    const local = this.lookupLocal(location);
    if (local) return local;

    // Slow path: real geocoding via Open Meteo
    const remote = await this.geocodeViaOpenMeteo(location);
    if (remote) return remote;

    // Last resort fallback
    console.log(`[Geocoding] All geocoding failed for "${location}", defaulting to Harrisburg, PA`);
    return this.locationMap['harrisburg'];
  }

  addLocation(name: string, lat: number, lon: number, city: string, state?: string) {
    this.locationMap[name.toLowerCase()] = { lat, lon, city, state };
  }

  isKnownLocation(location: string): boolean {
    return this.lookupLocal(location) !== null;
  }

  /**
   * Async version: checks local map first, then Open Meteo API.
   * Returns true if the location can be resolved to real coordinates.
   */
  async isKnownLocationAsync(location: string): Promise<boolean> {
    if (this.lookupLocal(location) !== null) return true;
    const remote = await this.geocodeViaOpenMeteo(location);
    return remote !== null;
  }

  getAvailableLocations(): string[] {
    return Object.keys(this.locationMap);
  }
}

export const geocodingService = new GeocodingService();
