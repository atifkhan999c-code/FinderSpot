/**
 * Geo-Location & Proximity Service for FinderSpot
 * Handles Haversine distance calculations, campus landmark presets, and coordinate resolution.
 */

// Default Campus Center Reference (University Plaza / Campus Hub)
const DEFAULT_CAMPUS_CENTER = {
  name: 'Campus Center Plaza',
  lat: 40.7295,
  lng: -73.9965,
};

// Recognized campus zones & buildings mapped to exact coordinates
const CAMPUS_LANDMARKS = [
  {
    keywords: ['library', 'quiet zone', 'stacks', 'study hall'],
    name: 'Main Campus Library',
    lat: 40.7298,
    lng: -73.9972,
    zone: 'North Academic Quad',
  },
  {
    keywords: ['student union', 'food court', 'cafeteria', 'subway', 'dining'],
    name: 'Student Union Complex',
    lat: 40.7305,
    lng: -73.9958,
    zone: 'Central Campus',
  },
  {
    keywords: ['science', 'physics', 'chemistry', 'biology', 'lab', 'room 402'],
    name: 'Science & Engineering Hall',
    lat: 40.7312,
    lng: -73.9980,
    zone: 'West Science Park',
  },
  {
    keywords: ['lounge', 'coffee', 'vending', 'student center'],
    name: 'Student Activity Lounge',
    lat: 40.7289,
    lng: -73.9960,
    zone: 'South Quad',
  },
  {
    keywords: ['parking', 'lot', 'section b', 'garage', 'vehicle'],
    name: 'West Parking Facility Section B',
    lat: 40.7278,
    lng: -73.9995,
    zone: 'West Campus Outer',
  },
  {
    keywords: ['quad', 'fountain', 'pathway', 'engineering quad'],
    name: 'Engineering Quad & Plaza',
    lat: 40.7320,
    lng: -73.9945,
    zone: 'East Tech Center',
  },
  {
    keywords: ['gym', 'athletic', 'fitness', 'arena', 'field', 'court'],
    name: 'Athletics & Recreation Center',
    lat: 40.7265,
    lng: -73.9940,
    zone: 'South Athletics Field',
  },
  {
    keywords: ['security', 'room 104', 'vault', 'campus police', 'desk'],
    name: 'Campus Security Headquarters (Room 104)',
    lat: 40.7291,
    lng: -73.9968,
    zone: 'Administration Wing',
  },
  {
    keywords: ['medical', 'clinic', 'health center', 'infirmary'],
    name: 'University Health & Wellness Center',
    lat: 40.7340,
    lng: -73.9990,
    zone: 'North Health Annex',
  },
];

/**
 * Calculate great-circle distance between two GPS points using the Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return null;
  }

  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Format raw meters into friendly human-readable strings
 * @param {number} meters 
 * @returns {string} e.g. "85 m away" or "1.4 km away"
 */
const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return 'Location specified';
  if (meters < 1000) {
    return `${meters} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
};

/**
 * Resolve coordinates for an item. If coordinates are already present, return them.
 * Otherwise, match against known campus landmarks or add slight jitter around campus center.
 * @param {Object} item 
 * @returns {{lat: number, lng: number}}
 */
const resolveItemCoordinates = (item) => {
  if (item.coordinates && typeof item.coordinates.lat === 'number' && typeof item.coordinates.lng === 'number') {
    return {
      lat: item.coordinates.lat,
      lng: item.coordinates.lng,
    };
  }

  const locationText = (item.location || '').toLowerCase();

  for (const landmark of CAMPUS_LANDMARKS) {
    for (const kw of landmark.keywords) {
      if (locationText.includes(kw)) {
        // Add tiny deterministic jitter so items at the same landmark don't overlap completely
        const hash = (item._id ? item._id.toString() : item.title || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const jitterLat = ((hash % 100) - 50) * 0.000008;
        const jitterLng = (((hash * 13) % 100) - 50) * 0.000008;
        return {
          lat: parseFloat((landmark.lat + jitterLat).toFixed(6)),
          lng: parseFloat((landmark.lng + jitterLng).toFixed(6)),
        };
      }
    }
  }

  // Fallback near campus center with slight offset
  const hash = (item._id ? item._id.toString() : item.title || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const jitterLat = ((hash % 120) - 60) * 0.000015;
  const jitterLng = (((hash * 17) % 120) - 60) * 0.000015;

  return {
    lat: parseFloat((DEFAULT_CAMPUS_CENTER.lat + jitterLat).toFixed(6)),
    lng: parseFloat((DEFAULT_CAMPUS_CENTER.lng + jitterLng).toFixed(6)),
  };
};

module.exports = {
  DEFAULT_CAMPUS_CENTER,
  CAMPUS_LANDMARKS,
  calculateHaversineDistance,
  formatDistance,
  resolveItemCoordinates,
};
