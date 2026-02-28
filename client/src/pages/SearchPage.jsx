import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchTrips, requestJoin } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState({});

  const search = async (e) => {
    e.preventDefault();
    setError('');
    setResults(null);
    setLoading(true);
    try {
      const params = code.trim() ? { code: code.trim() } : { q: query.trim() };
      const data = await searchTrips(params);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (tripId) => {
    if (!user) return navigate('/login');
    try {
      await requestJoin(tripId);
      setJoined((p) => ({ ...p, [tripId]: true }));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send join request');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Find a Trip</h1>

      <form onSubmit={search} className="space-y-3 mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCode(''); }}
            placeholder="Search by trip name…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || (!query.trim() && !code.trim())}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            Search
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">or enter a trip code:</span>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setQuery(''); }}
            placeholder="ABC123"
            maxLength={6}
            className="w-28 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {loading && <p className="text-slate-400 text-sm">Searching…</p>}

      {results !== null && results.length === 0 && (
        <p className="text-slate-400 text-sm">No trips found.</p>
      )}

      {results?.length > 0 && (
        <div className="space-y-3">
          {results.map((trip) => (
            <div key={trip.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{trip.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    trip.visibility === 'public'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {trip.visibility}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {trip.destination} · {trip.startDate} → {trip.endDate}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  by {trip.creatorName} · {trip.memberCount} member{trip.memberCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition"
                >
                  View
                </button>
                {user && !joined[trip.id] && (
                  <button
                    onClick={() => handleJoin(trip.id)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                  >
                    Request to Join
                  </button>
                )}
                {joined[trip.id] && (
                  <span className="text-xs text-green-600 font-medium">Request sent!</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
