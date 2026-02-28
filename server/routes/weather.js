import { Router } from 'express';
import { getWeatherForecast, getCurrentWeather } from '../services/weather.js';

const router = Router();

// GET /api/weather/forecast?location=Paris
router.get('/forecast', async (req, res) => {
  const { location } = req.query;
  if (!location) return res.status(400).json({ error: 'location query param required' });
  try {
    const data = await getWeatherForecast(location);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weather/current?location=Paris
router.get('/current', async (req, res) => {
  const { location } = req.query;
  if (!location) return res.status(400).json({ error: 'location query param required' });
  try {
    const data = await getCurrentWeather(location);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
