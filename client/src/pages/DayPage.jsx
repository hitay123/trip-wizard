import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { getTrip, updateDay } from '../utils/api.js';
import { useChat } from '../context/ChatContext.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import PlacesPanel from '../components/PlacesPanel.jsx';
import Timeline from '../components/Timeline.jsx';

function ActivityEditor({ day, tripId, onSave }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', time: '', duration: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const newActivity = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        ...form,
      };
      const updated = await updateDay(tripId, day.id, {
        activities: [...(day.activities || []), newActivity],
      });
      onSave(updated);
      setForm({ name: '', time: '', duration: '', notes: '' });
      setAdding(false);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (actId) => {
    setSaving(true);
    try {
      const updated = await updateDay(tripId, day.id, {
        activities: day.activities.filter((a) => a.id !== actId),
      });
      onSave(updated);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Activities</h3>
        <button onClick={() => setAdding(!adding)} className="btn-secondary text-xs px-3 py-1.5">
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
          <input className="input text-sm" value={form.name} onChange={set('name')} placeholder="Activity name *" />
          <div className="grid grid-cols-2 gap-2">
            <input type="time" className="input text-sm" value={form.time} onChange={set('time')} />
            <input type="number" className="input text-sm" value={form.duration} onChange={set('duration')} placeholder="Duration (min)" min="1" />
          </div>
          <input className="input text-sm" value={form.notes} onChange={set('notes')} placeholder="Notes" />
          <button onClick={handleAdd} disabled={!form.name || saving} className="btn-primary text-sm w-full justify-center">
            {saving ? 'Adding…' : 'Add Activity'}
          </button>
        </div>
      )}

      {day.activities?.length > 0 ? (
        <ul className="space-y-2">
          {[...day.activities]
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            .map((a) => (
              <li key={a.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                {a.time && <span className="text-blue-600 font-mono text-xs w-10 shrink-0">{a.time}</span>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                  {a.notes && <p className="text-xs text-slate-400 truncate">{a.notes}</p>}
                </div>
                {a.duration && <span className="text-xs text-slate-400 shrink-0">{a.duration}m</span>}
                <button
                  onClick={() => handleRemove(a.id)}
                  disabled={saving}
                  className="text-slate-300 hover:text-red-400 transition text-sm shrink-0"
                >
                  ✕
                </button>
              </li>
            ))}
        </ul>
      ) : !adding ? (
        <p className="text-sm text-slate-400 text-center py-3">No activities yet — add some above!</p>
      ) : null}
    </div>
  );
}

export default function DayPage() {
  const { tripId, dayId } = useParams();
  const [trip, setTrip] = useState(null);
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plan');
  const { openChat } = useChat();

  useEffect(() => {
    getTrip(tripId)
      .then((t) => {
        setTrip(t);
        setDay(t.days?.find((d) => d.id === dayId) || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tripId, dayId]);

  const handleDayUpdate = (updatedDay) => setDay(updatedDay);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-slate-100 rounded w-1/3" />
        <div className="h-4 bg-slate-100 rounded w-1/4" />
      </div>
    );
  }

  if (!trip || !day) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-slate-500">
        Day not found. <Link to={`/trips/${tripId}`} className="text-blue-600 underline">Back to trip</Link>
      </div>
    );
  }

  const location = day.location || trip.destination;
  const parsedDate = parseISO(day.date);

  const TABS = [
    { id: 'plan', label: '📋 Plan' },
    { id: 'places', label: '📍 Places' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5 pb-24">
      {/* Header */}
      <div>
        <Link to={`/trips/${tripId}`} className="text-sm text-slate-400 hover:text-slate-600 transition">
          ← {trip.name}
        </Link>
        <div className="flex items-center justify-between mt-2 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex flex-col items-center justify-center text-white shrink-0">
              <span className="text-xs leading-none opacity-80">{format(parsedDate, 'MMM')}</span>
              <span className="text-xl font-bold leading-tight">{format(parsedDate, 'd')}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-800 truncate">{format(parsedDate, 'EEEE, MMMM d')}</h1>
              <p className="text-blue-600 font-medium truncate">{location}</p>
            </div>
          </div>
          <button
            onClick={openChat}
            className="btn-primary text-sm shrink-0"
            title="Open AI assistant"
          >
            🧙 Ask
          </button>
        </div>
        {day.accommodation && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-3 py-2 w-fit">
            <span>🏨</span>
            <span className="font-medium">{day.accommodation.name}</span>
            {day.accommodation.address && <span className="text-slate-400">· {day.accommodation.address}</span>}
            {day.accommodation.checkIn && <span className="text-slate-400">· Check-in {day.accommodation.checkIn}</span>}
          </div>
        )}
      </div>

      {/* Weather always shown */}
      <WeatherWidget location={location} date={day.date} />

      {/* Mobile tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl lg:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Desktop: two-column | Mobile: tabbed */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-5 lg:space-y-0">
        {/* Left: Plan + Timeline */}
        <div className={`space-y-5 ${activeTab !== 'plan' ? 'hidden lg:block' : ''}`}>
          <ActivityEditor day={day} tripId={tripId} onSave={handleDayUpdate} />
          <Timeline day={day} tripId={tripId} />
          {day.notes && (
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-2">Day Notes</h3>
              <p className="text-sm text-slate-600">{day.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Places */}
        <div className={activeTab !== 'places' ? 'hidden lg:block' : ''}>
          <PlacesPanel location={location} />
        </div>
      </div>
    </div>
  );
}
