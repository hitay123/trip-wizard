import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import tripsRouter from './routes/trips.js';
import chatRouter from './routes/chat.js';
import weatherRouter from './routes/weather.js';
import placesRouter from './routes/places.js';
import authRouter from './routes/auth.js';
import notificationsRouter from './routes/notifications.js';
import messagesRouter from './routes/messages.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the Vite proxy / ngrok so req.ip reflects the real client
app.set('trust proxy', true);

app.use(cors({
  origin: (origin, cb) => {
    // Allow: no origin (same-origin / curl), localhost, any ngrok domain
    if (!origin || origin.includes('localhost') || origin.includes('ngrok')) {
      return cb(null, true);
    }
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/trips', messagesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/places', placesRouter);

// Client config (exposes Maps key for the browser)
app.get('/api/config', (req, res) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_PLACES_API_KEY || '' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeys: {
      gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
      openweather: !!process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'your_openweathermap_api_key_here',
      googlePlaces: !!process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY !== 'your_google_places_api_key_here',
    },
  });
});

app.listen(PORT, () => {
  console.log(`\n🧙 Trip Wizard server running on http://localhost:${PORT}`);
  console.log(`   API keys configured:`);
  console.log(`   - Gemini: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '✅' : '❌ (mock mode)'}`);
  console.log(`   - OpenWeather: ${process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'your_openweathermap_api_key_here' ? '✅' : '❌ (mock mode)'}`);
  console.log(`   - Google Places: ${process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY !== 'your_google_places_api_key_here' ? '✅' : '❌ (mock mode)'}`);
  console.log(`   - JWT: ${process.env.JWT_SECRET ? '✅' : '❌ (auth will fail)'}\n`);
});
