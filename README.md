# 🧙 Trip Wizard

A full-stack AI-powered travel planning web app built with React + Node.js/Express.

## Features

- **Itinerary Planning** — Create trips with dates, travelers, daily entries, activities, and accommodation
- **AI Day Assistant** — Chat-style interface powered by Gemini (gemini-2.0-flash), context-aware of your current day's plan and weather
- **Live Weather** — Current conditions and 5-day forecast via OpenWeatherMap
- **Nearby Places** — Google Places API integration with ratings, open status, and busyness estimates
- **Schedule Optimizer** — AI-powered daily schedule optimization factoring in weather, crowds, and opening hours
- **Visual Timeline** — Daily activity timeline with weather suitability and crowd level indicators
- **Mobile-first UI** — Responsive Tailwind CSS design with tabbed mobile navigation

> All features work in **demo/mock mode** without API keys — add your keys in `.env` to unlock live data and real AI.

---

## Project Structure

```
tripWizard/
├── client/             # React + Vite frontend
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── pages/      # Route-level pages
│       └── utils/      # API client
├── server/             # Express API
│   ├── routes/         # REST endpoints
│   ├── services/       # Gemini, Weather, Places logic
│   └── db/             # JSON file storage
├── data/               # trips.json (auto-created)
├── .env.example        # API key template
└── README.md
```

---

## Setup

### 1. Clone and install dependencies

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure API keys

```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:

| Key | Where to get it | Required for |
|-----|----------------|-------------|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/apikey) | AI assistant, schedule optimizer |
| `OPENWEATHER_API_KEY` | [openweathermap.org/api](https://openweathermap.org/api) | Live weather data |
| `GOOGLE_PLACES_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → Maps → Places API | Real nearby places |

> **No keys? No problem.** The app runs in demo mode with realistic mock data for all features.

### 3. Run the app

Open **two terminals**:

```bash
# Terminal 1 — Start the backend (from /server)
cd server
npm run dev

# Terminal 2 — Start the frontend (from /client)
cd client
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trips` | List all trips |
| POST | `/api/trips` | Create a trip |
| GET | `/api/trips/:id` | Get trip + days |
| PUT | `/api/trips/:id` | Update trip |
| DELETE | `/api/trips/:id` | Delete trip |
| POST | `/api/trips/:id/days` | Add a day entry |
| PUT | `/api/trips/:id/days/:dayId` | Update a day |
| DELETE | `/api/trips/:id/days/:dayId` | Delete a day |
| POST | `/api/chat` | Chat with AI assistant |
| POST | `/api/chat/optimize` | Optimize day schedule |
| GET | `/api/weather/current?location=` | Current weather |
| GET | `/api/weather/forecast?location=` | 5-day forecast |
| GET | `/api/places/nearby?location=&type=` | Nearby places |
| GET | `/api/health` | API status + key check |

---

## Google Places API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Places API** and **Geocoding API**
4. Create an API key under **Credentials**
5. Add to `.env` as `GOOGLE_PLACES_API_KEY`

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, date-fns
- **Backend**: Node.js, Express, ES Modules
- **AI**: Google Generative AI SDK (`gemini-2.0-flash`)
- **Weather**: OpenWeatherMap API
- **Places**: Google Places API
- **Storage**: JSON file (`data/trips.json`)
