import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { format, parseISO } from 'date-fns';
import { getTrips, updateDay, searchPlaces } from '../utils/api.js';

// ── Constants ────────────────────────────────────────────────────────────────

const PLACE_TYPES = [
  { value: '', label: 'All', icon: '🗺️' },
  { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { value: 'cafe', label: 'Cafes', icon: '☕' },
  { value: 'bar', label: 'Bars', icon: '🍺' },
  { value: 'museum', label: 'Museums', icon: '🏛️' },
  { value: 'tourist_attraction', label: 'Attractions', icon: '🎡' },
  { value: 'park', label: 'Parks', icon: '🌳' },
  { value: 'shopping_mall', label: 'Shopping', icon: '🛍️' },
  { value: 'spa', label: 'Spa', icon: '💆' },
  { value: 'night_club', label: 'Nightlife', icon: '🌙' },
];

const RADIUS_OPTIONS = [
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 2000, label: '2km' },
  { value: 5000, label: '5km' },
  { value: 10000, label: '10km' },
];

const TYPE_ICONS = {
  restaurant: '🍽️', cafe: '☕', bar: '🍺', museum: '🏛️',
  tourist_attraction: '🎡', park: '🌳', shopping_mall: '🛍️',
  spa: '💆', night_club: '🌙',
};

const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS = { clickableIcons: false, gestureHandling: 'greedy' };

// ── MapPanel ─────────────────────────────────────────────────────────────────
// Separate component so useJsApiLoader is always called at the top level

function MapPanel({ apiKey, center, zoom, results, selectedPlace, onSelectPlace }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  const mapRef = useRef(null);
  const onLoad = useCallback((map) => { mapRef.current = map; }, []);

  useEffect(() => {
    if (mapRef.current && center) mapRef.current.panTo(center);
  }, [center]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center p-6 max-w-xs">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="font-semibold text-slate-700">Map failed to load</p>
          <p className="text-sm text-slate-500 mt-1">
            Make sure "Maps JavaScript API" is enabled in your Google Cloud Console for this API key.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <div key={d} className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center || DEFAULT_CENTER}
      zoom={zoom}
      onLoad={onLoad}
      options={MAP_OPTIONS}
    >
      {results.map((place) => (
        <Marker
          key={place.id}
          position={{ lat: place.lat, lng: place.lng }}
          onClick={() => onSelectPlace(place)}
          animation={selectedPlace?.id === place.id ? 1 : undefined}
        />
      ))}

      {selectedPlace && (
        <InfoWindow
          position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
          onCloseClick={() => onSelectPlace(null)}
        >
          <div className="max-w-[200px] font-sans">
            {selectedPlace.photo && (
              <img
                src={selectedPlace.photo}
                alt={selectedPlace.name}
                className="w-full h-24 object-cover rounded mb-2"
              />
            )}
            <p className="font-semibold text-sm text-slate-800 leading-tight">{selectedPlace.name}</p>
            {selectedPlace.rating && (
              <p className="text-xs text-yellow-600 mt-0.5">
                ⭐ {selectedPlace.rating}
                <span className="text-slate-400 ml-1">({selectedPlace.userRatingsTotal?.toLocaleString()})</span>
              </p>
            )}
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{selectedPlace.vicinity}</p>
            {selectedPlace.openNow !== null && (
              <span className={`inline-block text-xs mt-1.5 px-2 py-0.5 rounded-full font-medium ${
                selectedPlace.openNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {selectedPlace.openNow ? '● Open now' : '● Closed'}
              </span>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

// ── AddToTripModal ────────────────────────────────────────────────────────────

function AddToTripModal({ place, trips, onClose }) {
  const [tripId, setTripId] = useState('');
  const [dayId, setDayId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const trip = trips.find((t) => t.id === tripId);
  const days = trip?.days || [];

  const handleAdd = async () => {
    if (!tripId || !dayId) return;
    setLoading(true);
    try {
      const day = days.find((d) => d.id === dayId);
      const newActivity = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: place.name,
        time: '',
        duration: 60,
        notes: place.vicinity || '',
      };
      await updateDay(tripId, dayId, {
        ...day,
        activities: [...(day.activities || []), newActivity],
      });
      setSuccess(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      alert('Failed to add: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Add to Trip</h2>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{place.name}</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {success ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-semibold text-green-700">Added to itinerary!</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Trip</label>
                <select
                  className="select w-full"
                  value={tripId}
                  onChange={(e) => { setTripId(e.target.value); setDayId(''); }}
                >
                  <option value="">Choose a trip…</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {tripId && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Day</label>
                  {days.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No days planned yet in this trip.</p>
                  ) : (
                    <select
                      className="select w-full"
                      value={dayId}
                      onChange={(e) => setDayId(e.target.value)}
                    >
                      <option value="">Choose a day…</option>
                      {days.map((d) => {
                        let label = d.date;
                        try { label = format(parseISO(d.date), 'EEE, MMM d') + ' — ' + d.location; } catch {}
                        return <option key={d.id} value={d.id}>{label}</option>;
                      })}
                    </select>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                <button
                  onClick={handleAdd}
                  disabled={!tripId || !dayId || loading}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding…' : '+ Add Activity'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PlaceCard ─────────────────────────────────────────────────────────────────

function PlaceCard({ place, isSelected, onSelect, onAddToTrip }) {
  const icon = TYPE_ICONS[place.type] || '📍';
  return (
    <div
      className={`flex gap-3 p-3 cursor-pointer border-b border-slate-50 hover:bg-blue-50/60 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-[3px] border-l-blue-500' : 'border-l-[3px] border-l-transparent'
      }`}
      onClick={() => onSelect(place)}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center text-2xl">
        {place.photo ? (
          <img src={place.photo} alt={place.name} className="w-full h-full object-cover" />
        ) : icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-800 truncate leading-tight">{place.name}</p>
        {place.rating && (
          <p className="text-xs text-yellow-600 mt-0.5">
            {'★'.repeat(Math.round(place.rating))}{'☆'.repeat(5 - Math.round(place.rating))}
            <span className="text-slate-400 ml-1">{place.rating} ({place.userRatingsTotal?.toLocaleString()})</span>
          </p>
        )}
        <p className="text-xs text-slate-500 mt-0.5 truncate">{place.vicinity}</p>
        <div className="flex items-center justify-between mt-1.5">
          {place.openNow !== null ? (
            <span className={`text-xs font-medium ${place.openNow ? 'text-green-600' : 'text-red-500'}`}>
              {place.openNow ? '● Open' : '● Closed'}
            </span>
          ) : <span />}
          <button
            onClick={(e) => { e.stopPropagation(); onAddToTrip(place); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition px-2 py-0.5 rounded-lg hover:bg-blue-50"
          >
            + Trip
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ExplorePage ───────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [mapsApiKey, setMapsApiKey] = useState('');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [filters, setFilters] = useState({ type: '', radius: 2000, opennow: false });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(13);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeView, setActiveView] = useState('list');
  const [addModal, setAddModal] = useState(null);
  const [trips, setTrips] = useState([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((d) => setMapsApiKey(d.googleMapsApiKey || '')).catch(() => {});
    getTrips().then(setTrips).catch(() => {});
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        setLocation(coords);
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => { alert('Could not get your location.'); setLocating(false); },
      { timeout: 8000 }
    );
  };

  const doSearch = async (overrideFilters) => {
    if (!query.trim() && !location.trim()) return;
    setLoading(true);
    setSelectedPlace(null);
    const f = overrideFilters || filters;
    try {
      const data = await searchPlaces({
        query: query.trim(),
        location: location.trim(),
        type: f.type || undefined,
        radius: f.radius,
        opennow: f.opennow,
      });
      setResults(data.places || []);
      setIsMock(!!data.isMock);
      if (data.center) {
        setCenter(data.center);
        setZoom(data.places?.length ? 14 : 12);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    const next = { ...filters, type };
    setFilters(next);
    if (query.trim() || location.trim()) doSearch(next);
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place === selectedPlace ? null : place);
    if (place) {
      setCenter({ lat: place.lat, lng: place.lng });
      setZoom(16);
      setActiveView('map');
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Search bar ── */}
      <div className="bg-white border-b border-slate-100 px-4 pt-3 pb-2 space-y-2.5 shrink-0">

        {/* Row 1: inputs + button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              className="input pl-9 w-full"
              placeholder="cafes, museums, pizza…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            />
          </div>
          <div className="relative flex-1 hidden sm:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📍</span>
            <input
              className="input pl-9 w-full"
              placeholder="Paris, France…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            />
          </div>
          <button
            onClick={handleUseMyLocation}
            disabled={locating}
            title="Use my current location"
            className="shrink-0 px-3 h-[38px] rounded-lg border border-slate-200 hover:bg-slate-50 transition text-base disabled:opacity-60"
          >
            {locating ? '⏳' : '🎯'}
          </button>
          <button
            onClick={() => doSearch()}
            disabled={loading}
            className="btn-primary shrink-0 px-4"
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {/* Location on mobile */}
        <div className="sm:hidden relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📍</span>
          <input
            className="input pl-9 w-full"
            placeholder="Paris, France…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
        </div>

        {/* Type pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {PLACE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTypeChange(t.value)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium border transition ${
                filters.type === t.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Radius + Open now */}
        <div className="flex items-center gap-4 pb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 shrink-0">Radius:</span>
            <div className="flex gap-0.5">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setFilters((f) => ({ ...f, radius: r.value }))}
                  className={`text-xs px-2 py-0.5 rounded-md font-medium transition ${
                    filters.radius === r.value
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              role="switch"
              aria-checked={filters.opennow}
              onClick={() => setFilters((f) => ({ ...f, opennow: !f.opennow }))}
              className={`w-8 h-4 rounded-full relative transition-colors ${filters.opennow ? 'bg-green-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${filters.opennow ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs text-slate-600">Open now</span>
          </label>
        </div>
      </div>

      {/* ── Mobile tab switcher ── */}
      <div className="md:hidden flex border-b border-slate-100 bg-white shrink-0">
        <button
          onClick={() => setActiveView('list')}
          className={`flex-1 py-2 text-sm font-medium transition ${activeView === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
        >
          📋 List {results.length > 0 && <span className="ml-1 text-xs text-slate-400">({results.length})</span>}
        </button>
        <button
          onClick={() => setActiveView('map')}
          className={`flex-1 py-2 text-sm font-medium transition ${activeView === 'map' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
        >
          🗺️ Map
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — Results list */}
        <div className={`w-full md:w-[380px] shrink-0 overflow-y-auto border-r border-slate-100 bg-white ${activeView === 'map' ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>

          {/* Mock warning */}
          {isMock && results.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 shrink-0">
              <p className="text-xs text-amber-700">⚠️ Demo data — add a Google Places API key for real results</p>
            </div>
          )}

          {/* Count header */}
          {!loading && results.length > 0 && (
            <div className="px-4 py-2 border-b border-slate-50 shrink-0">
              <p className="text-xs text-slate-500">{results.length} place{results.length !== 1 ? 's' : ''} found</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <div key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
              <p className="text-sm text-slate-500">Searching…</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
              <span className="text-5xl">🌍</span>
              <div>
                <p className="font-semibold text-slate-700">Discover any place</p>
                <p className="text-sm text-slate-400 mt-1">
                  Search for cafes, museums, restaurants and more — then add them directly to your trip itinerary.
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && results.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isSelected={selectedPlace?.id === place.id}
              onSelect={handleSelectPlace}
              onAddToTrip={setAddModal}
            />
          ))}
        </div>

        {/* Right panel — Map */}
        <div className={`flex-1 ${activeView === 'list' ? 'hidden md:block' : 'block'}`}>
          {mapsApiKey ? (
            <MapPanel
              apiKey={mapsApiKey}
              center={center}
              zoom={zoom}
              results={results}
              selectedPlace={selectedPlace}
              onSelectPlace={handleSelectPlace}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-50">
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <div key={d} className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add to trip modal */}
      {addModal && (
        <AddToTripModal
          place={addModal}
          trips={trips}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  );
}
