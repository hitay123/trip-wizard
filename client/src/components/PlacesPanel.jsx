import React, { useEffect, useState } from 'react';
import { getNearbyPlaces } from '../utils/api.js';

const TYPES = [
  { value: 'tourist_attraction', label: '🏛️ Attractions' },
  { value: 'restaurant', label: '🍽️ Restaurants' },
  { value: 'museum', label: '🖼️ Museums' },
  { value: 'park', label: '🌳 Parks' },
  { value: 'shopping_mall', label: '🛍️ Shopping' },
];

function StarRating({ rating }) {
  if (!rating) return <span className="text-xs text-slate-400">No rating</span>;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-xs">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? 'text-amber-400' : i === full && half ? 'text-amber-300' : 'text-slate-200'}>
          ★
        </span>
      ))}
      <span className="text-slate-500 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function BusynessBar({ level }) {
  if (!level) return null;
  const color = level < 40 ? 'bg-green-400' : level < 70 ? 'bg-amber-400' : 'bg-red-400';
  const label = level < 40 ? 'Quiet' : level < 70 ? 'Moderate' : 'Busy';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${level}%` }} />
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

export default function PlacesPanel({ location }) {
  const [type, setType] = useState('tourist_attraction');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    getNearbyPlaces(location, type)
      .then((data) => {
        setPlaces(data.places || []);
        setIsMock(data.isMock || false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [location, type]);

  if (!location) return null;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Nearby Places</h3>
        {isMock && <span className="text-xs text-amber-600">Demo data</span>}
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition font-medium ${
              type === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : places.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No places found nearby</p>
      ) : (
        <div className="space-y-2">
          {places.map((place, idx) => (
            <div key={place.id} className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    <p className="font-medium text-sm text-slate-800 truncate">{place.name}</p>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{place.vicinity}</p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    place.openNow === true
                      ? 'bg-green-100 text-green-700'
                      : place.openNow === false
                      ? 'bg-red-50 text-red-500'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {place.openNow === true ? 'Open' : place.openNow === false ? 'Closed' : '?'}
                </span>
              </div>
              <StarRating rating={place.rating} />
              {place.busyness !== undefined && <BusynessBar level={place.busyness} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
