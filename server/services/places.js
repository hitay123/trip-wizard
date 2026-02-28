import axios from 'axios';

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

// Search nearby places using Google Places API
export async function searchNearbyPlaces({ location, type = 'tourist_attraction', radius = 2000 }) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || key === 'your_google_places_api_key_here') {
    return getMockPlaces(location, type);
  }

  try {
    // First geocode the location text
    const geoRes = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address: location, key },
    });
    if (!geoRes.data.results.length) throw new Error('Could not geocode location');
    const { lat, lng } = geoRes.data.results[0].geometry.location;

    const res = await axios.get(`${PLACES_BASE}/nearbysearch/json`, {
      params: { location: `${lat},${lng}`, radius, type, key },
    });

    const places = res.data.results.slice(0, 10).map((p) => ({
      id: p.place_id,
      name: p.name,
      type,
      rating: p.rating || null,
      userRatingsTotal: p.user_ratings_total || 0,
      vicinity: p.vicinity,
      openNow: p.opening_hours?.open_now ?? null,
      photo: p.photos?.[0]
        ? `${PLACES_BASE}/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${key}`
        : null,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
    }));

    // Sort by rating desc
    places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return { places, isMock: false };
  } catch (err) {
    console.error('Places API error:', err.message);
    return getMockPlaces(location, type);
  }
}

// Search places by keyword + optional location, radius, type, opennow
export async function searchPlacesByText({ query, location, radius = 2000, type, opennow = false }) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || key === 'your_google_places_api_key_here') {
    return getMockPlaces(location || query || 'Unknown', type || 'tourist_attraction');
  }

  try {
    let lat = null, lng = null;

    if (location) {
      const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      } else {
        const geoRes = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: { address: location, key },
        });
        if (geoRes.data.results.length) {
          lat = geoRes.data.results[0].geometry.location.lat;
          lng = geoRes.data.results[0].geometry.location.lng;
        }
      }
    }

    let rawResults;
    let center = lat !== null && lng !== null ? { lat, lng } : null;

    if (lat !== null && lng !== null) {
      // Nearby search – respects radius precisely
      const params = { location: `${lat},${lng}`, radius, key };
      if (query) params.keyword = query;
      if (type) params.type = type;
      const res = await axios.get(`${PLACES_BASE}/nearbysearch/json`, { params });
      rawResults = res.data.results;
    } else {
      // Text search – no specific location
      const params = { query: query || type || 'things to do', key };
      if (type) params.type = type;
      const res = await axios.get(`${PLACES_BASE}/textsearch/json`, { params });
      rawResults = res.data.results;
      if (rawResults.length) {
        center = rawResults[0].geometry.location;
      }
    }

    let places = rawResults.slice(0, 20).map((p) => ({
      id: p.place_id,
      name: p.name,
      type: type || 'place',
      rating: p.rating || null,
      userRatingsTotal: p.user_ratings_total || 0,
      vicinity: p.vicinity || p.formatted_address,
      openNow: p.opening_hours?.open_now ?? null,
      photo: p.photos?.[0]
        ? `${PLACES_BASE}/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${key}`
        : null,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
    }));

    if (opennow) {
      places = places.filter((p) => p.openNow === true);
    }

    return { places, isMock: false, center };
  } catch (err) {
    console.error('Places search error:', err.message);
    return getMockPlaces(location || query || 'Unknown', type || 'tourist_attraction');
  }
}

// Get place details (hours, etc.)
export async function getPlaceDetails(placeId) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || key === 'your_google_places_api_key_here') {
    return getMockPlaceDetails(placeId);
  }

  try {
    const res = await axios.get(`${PLACES_BASE}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'name,opening_hours,formatted_address,rating,website,formatted_phone_number',
        key,
      },
    });
    return res.data.result;
  } catch (err) {
    console.error('Places Details error:', err.message);
    return getMockPlaceDetails(placeId);
  }
}

// --- Mock data for development ---
const MOCK_TYPES = {
  tourist_attraction: [
    { name: 'Grand Bazaar', rating: 4.5, vicinity: 'Old City', openNow: true },
    { name: 'Blue Mosque', rating: 4.7, vicinity: 'Sultanahmet', openNow: true },
    { name: 'Topkapi Palace', rating: 4.6, vicinity: 'Fatih', openNow: true },
    { name: 'Galata Tower', rating: 4.4, vicinity: 'Beyoğlu', openNow: false },
    { name: 'Hagia Sophia', rating: 4.8, vicinity: 'Sultanahmet', openNow: true },
  ],
  restaurant: [
    { name: 'Karaköy Güllüoğlu', rating: 4.6, vicinity: 'Karaköy', openNow: true },
    { name: 'Çiya Sofrası', rating: 4.5, vicinity: 'Kadıköy', openNow: true },
    { name: 'Nusr-Et', rating: 4.3, vicinity: 'Etiler', openNow: true },
    { name: 'Hatay Medeniyetler', rating: 4.4, vicinity: 'Beyoğlu', openNow: false },
    { name: 'Mikla Restaurant', rating: 4.6, vicinity: 'Tepebaşı', openNow: true },
  ],
  museum: [
    { name: 'Istanbul Modern', rating: 4.5, vicinity: 'Karaköy', openNow: true },
    { name: 'Pera Museum', rating: 4.4, vicinity: 'Beyoğlu', openNow: true },
    { name: 'Sakıp Sabancı Museum', rating: 4.6, vicinity: 'Emirgan', openNow: false },
  ],
};

function getMockPlaces(location, type) {
  const pool = MOCK_TYPES[type] || MOCK_TYPES.tourist_attraction;
  const places = pool.map((p, i) => ({
    id: `mock-${type}-${i}`,
    name: p.name,
    type,
    rating: p.rating,
    userRatingsTotal: Math.floor(Math.random() * 5000) + 500,
    vicinity: `${p.vicinity}, ${location}`,
    openNow: p.openNow,
    photo: null,
    lat: 41.0082 + (Math.random() - 0.5) * 0.05,
    lng: 28.9784 + (Math.random() - 0.5) * 0.05,
    busyness: estimateBusyness(),
  }));
  return { places, isMock: true };
}

function getMockPlaceDetails(placeId) {
  return {
    name: 'Sample Place',
    formatted_address: '123 Main Street',
    opening_hours: {
      weekday_text: [
        'Monday: 9:00 AM – 6:00 PM',
        'Tuesday: 9:00 AM – 6:00 PM',
        'Wednesday: 9:00 AM – 6:00 PM',
        'Thursday: 9:00 AM – 6:00 PM',
        'Friday: 9:00 AM – 8:00 PM',
        'Saturday: 10:00 AM – 8:00 PM',
        'Sunday: 10:00 AM – 5:00 PM',
      ],
    },
    isMock: true,
  };
}

// Estimate busyness level (0-100) based on time of day
function estimateBusyness() {
  const hour = new Date().getHours();
  if (hour < 9 || hour > 20) return 10;
  if (hour >= 11 && hour <= 13) return 85;
  if (hour >= 17 && hour <= 19) return 90;
  return 50 + Math.floor(Math.random() * 20);
}
