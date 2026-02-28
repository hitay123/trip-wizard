import { Router } from 'express';
import { chatWithAssistant, optimizeSchedule } from '../services/gemini.js';
import { getTripById } from '../db/storage.js';
import { getCurrentWeather } from '../services/weather.js';

const router = Router();

// POST /api/chat
router.post('/', async (req, res) => {
  const { messages, tripId, dayId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  let trip = null;
  let dayEntry = null;
  let weather = null;

  if (tripId) {
    trip = getTripById(tripId);
    if (trip && dayId) {
      dayEntry = trip.days?.find((d) => d.id === dayId) || null;
    }
    if (trip) {
      try {
        const loc = dayEntry?.location || trip.destination;
        const forecast = await getCurrentWeather(loc);
        weather = forecast;
      } catch (e) {
        // weather is optional
      }
    }
  }

  try {
    const result = await chatWithAssistant({ messages, trip, dayEntry, weather });
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'AI assistant error: ' + err.message });
  }
});

// POST /api/chat/optimize
router.post('/optimize', async (req, res) => {
  const { tripId, dayId } = req.body;
  if (!tripId || !dayId) {
    return res.status(400).json({ error: 'tripId and dayId are required' });
  }

  const trip = getTripById(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const dayEntry = trip.days?.find((d) => d.id === dayId);
  if (!dayEntry) return res.status(404).json({ error: 'Day not found' });

  let weather = null;
  try {
    const loc = dayEntry.location || trip.destination;
    const forecast = await getCurrentWeather(loc);
    weather = forecast;
  } catch (e) {
    // weather optional
  }

  try {
    const result = await optimizeSchedule({ dayEntry, weather });
    res.json(result);
  } catch (err) {
    console.error('Optimize error:', err.message);
    res.status(500).json({ error: 'Optimizer error: ' + err.message });
  }
});

export default router;
