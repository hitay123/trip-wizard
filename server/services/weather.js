import axios from 'axios';

const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// Geocode a city name to lat/lon
async function geocode(location) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || key === 'your_openweathermap_api_key_here') {
    return getMockGeocode(location);
  }
  const res = await axios.get(`${GEO_URL}/direct`, {
    params: { q: location, limit: 1, appid: key },
  });
  if (!res.data.length) throw new Error(`Location not found: ${location}`);
  const { lat, lon, name, country } = res.data[0];
  return { lat, lon, name, country };
}

// Get 5-day forecast (returns daily summary)
export async function getWeatherForecast(location) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || key === 'your_openweathermap_api_key_here') {
    return getMockForecast(location);
  }

  try {
    const { lat, lon, name, country } = await geocode(location);
    const res = await axios.get(`${BASE_URL}/forecast`, {
      params: { lat, lon, appid: key, units: 'metric', cnt: 40 },
    });

    // Group by day
    const byDay = {};
    for (const item of res.data.list) {
      const date = item.dt_txt.split(' ')[0];
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(item);
    }

    const daily = Object.entries(byDay).map(([date, items]) => {
      const temps = items.map((i) => i.main.temp);
      const dominant = items[Math.floor(items.length / 2)];
      return {
        date,
        tempMin: Math.round(Math.min(...temps)),
        tempMax: Math.round(Math.max(...temps)),
        description: dominant.weather[0].description,
        icon: dominant.weather[0].icon,
        humidity: dominant.main.humidity,
        windSpeed: dominant.wind.speed,
        pop: Math.round(Math.max(...items.map((i) => (i.pop || 0) * 100))),
      };
    });

    return { location: `${name}, ${country}`, daily };
  } catch (err) {
    console.error('Weather forecast error:', err.message);
    // API key is set but call failed — return mock without isMock flag
    const fallback = getMockForecast(location);
    delete fallback.isMock;
    return fallback;
  }
}

// Get current weather
export async function getCurrentWeather(location) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || key === 'your_openweathermap_api_key_here') {
    return getMockCurrent(location);
  }

  try {
    const { lat, lon, name, country } = await geocode(location);
    const res = await axios.get(`${BASE_URL}/weather`, {
      params: { lat, lon, appid: key, units: 'metric' },
    });
    const d = res.data;
    return {
      location: `${name}, ${country}`,
      temp: Math.round(d.main.temp),
      feelsLike: Math.round(d.main.feels_like),
      description: d.weather[0].description,
      icon: d.weather[0].icon,
      humidity: d.main.humidity,
      windSpeed: d.wind.speed,
      visibility: d.visibility,
    };
  } catch (err) {
    console.error('Weather current error:', err.message);
    // API key is set but call failed — return mock without isMock flag
    const fallback = getMockCurrent(location);
    delete fallback.isMock;
    return fallback;
  }
}

// --- Mock data for development without API key ---
function getMockGeocode(location) {
  return { lat: 41.0082, lon: 28.9784, name: location, country: 'TR' };
}

function getMockForecast(location) {
  const today = new Date();
  const daily = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      tempMin: 14 + Math.floor(Math.random() * 4),
      tempMax: 22 + Math.floor(Math.random() * 6),
      description: ['clear sky', 'partly cloudy', 'light rain', 'sunny'][i % 4],
      icon: ['01d', '02d', '10d', '01d'][i % 4],
      humidity: 55 + Math.floor(Math.random() * 25),
      windSpeed: 3 + Math.random() * 5,
      pop: [5, 20, 70, 10, 30][i],
    };
  });
  return { location, daily, isMock: true };
}

function getMockCurrent(location) {
  return {
    location,
    temp: 21,
    feelsLike: 20,
    description: 'partly cloudy',
    icon: '02d',
    humidity: 60,
    windSpeed: 4.2,
    visibility: 10000,
    isMock: true,
  };
}
