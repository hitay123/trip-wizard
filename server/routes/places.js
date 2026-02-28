import { Router } from 'express';
import { searchNearbyPlaces, searchPlacesByText, getPlaceDetails } from '../services/places.js';

const router = Router();

// GET /api/places/nearby?location=Paris&type=restaurant&radius=1500
router.get('/nearby', async (req, res) => {
  const { location, type = 'tourist_attraction', radius = 2000 } = req.query;
  if (!location) return res.status(400).json({ error: 'location query param required' });
  try {
    const data = await searchNearbyPlaces({ location, type, radius: parseInt(radius) });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/places/search?query=pizza&location=Paris&radius=2000&type=restaurant&opennow=true
router.get('/search', async (req, res) => {
  const { query, location, radius = 2000, type, opennow } = req.query;
  if (!query && !location) return res.status(400).json({ error: 'query or location is required' });
  try {
    const data = await searchPlacesByText({
      query,
      location,
      radius: parseInt(radius),
      type: type || '',
      opennow: opennow === 'true',
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/places/:placeId
router.get('/:placeId', async (req, res) => {
  try {
    const data = await getPlaceDetails(req.params.placeId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
