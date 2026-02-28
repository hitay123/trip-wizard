import React from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '../context/AuthContext.jsx';

export default function TripCard({ trip, onDelete }) {
  const { user } = useAuth();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const duration = differenceInDays(end, start) + 1;
  const daysLogged = trip.days?.length || 0;
  const isAdmin = user && (trip.creatorId === user.id || trip.members?.some((m) => m.id === user.id && m.role === 'admin'));

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">✈️</span>
            <h3 className="font-semibold text-slate-800 truncate text-lg">{trip.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              trip.visibility === 'private' ? 'bg-slate-100 text-slate-500' : 'bg-green-50 text-green-700'
            }`}>
              {trip.visibility === 'private' ? '🔒' : '🌐'}
            </span>
          </div>
          <p className="text-blue-600 font-medium text-sm mb-2">{trip.destination}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>📅 {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}</span>
            <span>🗓️ {duration} day{duration !== 1 ? 's' : ''}</span>
            {trip.travelers?.length > 0 && (
              <span>👥 {trip.travelers.join(', ')}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="badge bg-blue-50 text-blue-700">
            {daysLogged}/{duration} days
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link to={`/trips/${trip.id}`} className="btn-primary text-sm flex-1 justify-center">
          Open Trip
        </Link>
        {isAdmin && (
          <button
            onClick={() => onDelete(trip.id)}
            className="btn-danger text-sm px-3"
            title="Delete trip"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
