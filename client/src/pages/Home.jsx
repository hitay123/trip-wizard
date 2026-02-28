import React, { useState, useEffect } from 'react';
import { getTrips, deleteTrip } from '../utils/api.js';
import TripCard from '../components/TripCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getTrips()
      .then(setTrips)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert('Failed to delete trip: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🧙</div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Trip Wizard</h1>
        <p className="text-slate-500 text-lg">Plan smarter. Travel better.</p>
        {!user && (
          <div className="mt-4 flex justify-center gap-3">
            <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
              Get started
            </Link>
            <Link to="/login" className="text-sm text-slate-600 hover:text-slate-800 px-5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
              Sign in
            </Link>
          </div>
        )}
      </div>

      {/* Trips list */}
      {fetching ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-5 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-5xl mb-4">🗺️</p>
          <p className="font-semibold text-slate-600 text-lg">No trips yet</p>
          {user ? (
            <p className="text-sm mt-2">Use the <strong>+ New Trip</strong> button in the top bar to get started</p>
          ) : (
            <p className="text-sm mt-2">Sign in to start planning</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
