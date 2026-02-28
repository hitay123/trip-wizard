import React, { useEffect, useState } from 'react';
import { getCurrentWeather, getWeatherForecast } from '../utils/api.js';

const ICON_URL = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

const WEATHER_BG = {
  '01': 'from-yellow-50 to-orange-50',
  '02': 'from-blue-50 to-slate-50',
  '03': 'from-slate-50 to-slate-100',
  '04': 'from-slate-100 to-slate-200',
  '09': 'from-blue-100 to-blue-50',
  '10': 'from-blue-100 to-indigo-50',
  '11': 'from-purple-50 to-slate-100',
  '13': 'from-blue-50 to-white',
  '50': 'from-slate-100 to-slate-50',
};

function bgForIcon(icon) {
  const code = icon?.slice(0, 2) || '01';
  return WEATHER_BG[code] || 'from-blue-50 to-slate-50';
}

export default function WeatherWidget({ location, date }) {
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    Promise.all([getCurrentWeather(location), getWeatherForecast(location)])
      .then(([cur, fore]) => {
        setCurrent(cur);
        setForecast(fore);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [location]);

  if (!location) return null;

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
        <div className="h-10 bg-slate-100 rounded w-1/2" />
      </div>
    );
  }

  if (error) {
    return <div className="card text-sm text-slate-500">Could not load weather: {error}</div>;
  }

  const bg = bgForIcon(current?.icon);
  const todayForecast = forecast?.daily?.find((d) => d.date === date);

  return (
    <div className={`card bg-gradient-to-br ${bg} border-0`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-0.5">{current?.location}</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-light text-slate-800">{current?.temp}°</span>
            <span className="text-sm text-slate-500 mb-1">C</span>
          </div>
          <p className="text-sm text-slate-600 capitalize">{current?.description}</p>
        </div>
        {current?.icon && (
          <img src={ICON_URL(current.icon)} alt={current.description} className="w-16 h-16 -mr-2 -mt-2" />
        )}
      </div>

      <div className="flex gap-4 mt-3 text-xs text-slate-500">
        <span>💧 {current?.humidity}%</span>
        <span>💨 {current?.windSpeed?.toFixed(1)} m/s</span>
        {todayForecast && <span>☔ {todayForecast.pop}% rain</span>}
      </div>

      {forecast?.daily && forecast.daily.length > 1 && (
        <div className="mt-4 pt-4 border-t border-white/60">
          <p className="text-xs font-medium text-slate-500 mb-2">5-Day Forecast</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {forecast.daily.slice(0, 5).map((d) => (
              <div key={d.date} className={`flex flex-col items-center min-w-[52px] p-2 rounded-xl bg-white/60 ${d.date === date ? 'ring-2 ring-blue-400' : ''}`}>
                <span className="text-xs text-slate-400">
                  {new Date(d.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })}
                </span>
                {d.icon && <img src={ICON_URL(d.icon)} alt="" className="w-8 h-8" />}
                <span className="text-xs font-semibold text-slate-700">{d.tempMax}°</span>
                <span className="text-xs text-slate-400">{d.tempMin}°</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {current?.isMock && (
        <p className="text-xs text-amber-600 mt-3">⚠️ Demo data — add OpenWeatherMap API key for live weather</p>
      )}
    </div>
  );
}
