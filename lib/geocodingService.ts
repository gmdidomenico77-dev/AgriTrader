/**
 * Geocoding Service - Convert location strings to coordinates
 * Uses a lookup for common locations; avoids false matches (e.g. "pa" inside "Cranberry Township, PA").
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

  private stateAbbrevMatchesLocation(normalized: string, abbrev: string): boolean {
    if (normalized === abbrev) return true;
    const suffix = `, ${abbrev}`;
    return normalized.endsWith(suffix);
  }

  /**
   * Get coordinates from location string.
   * Defaults to Harrisburg, PA only when there is no reasonable match.
   */
  getCoordinates(location: string): LocationCoordinates {
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

    console.log(`[Geocoding] Location "${location}" not found, defaulting to Harrisburg, PA`);
    return this.locationMap['harrisburg'];
  }

  addLocation(name: string, lat: number, lon: number, city: string, state?: string) {
    this.locationMap[name.toLowerCase()] = { lat, lon, city, state };
  }

  isKnownLocation(location: string): boolean {
    const normalized = location.toLowerCase().trim().replace(/\s+/g, ' ');
    if (this.locationMap[normalized]) return true;
    const cityPart = normalized.split(',')[0]?.trim() ?? normalized;
    if (cityPart && this.locationMap[cityPart]) return true;
    for (const [key] of Object.entries(this.locationMap)) {
      if (STATE_ABBREV_KEYS.has(key)) {
        if (this.stateAbbrevMatchesLocation(normalized, key)) return true;
        continue;
      }
      if (normalized.includes(key) || key.includes(normalized) || cityPart.includes(key) || key.includes(cityPart)) {
        return true;
      }
    }
    return false;
  }

  getAvailableLocations(): string[] {
    return Object.keys(this.locationMap);
  }
}

export const geocodingService = new GeocodingService();
