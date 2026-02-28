import React, { useState } from 'react';

function uuidSimple() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const EMPTY = {
  date: '',
  location: '',
  accommodation: { name: '', address: '', checkIn: '', checkOut: '' },
  activities: [],
  notes: '',
};

export default function DayForm({ trip, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...EMPTY, location: trip.destination });
  const [newActivity, setNewActivity] = useState({ name: '', time: '', duration: '', notes: '' });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setAccom = (k) => (e) =>
    setForm((f) => ({ ...f, accommodation: { ...f.accommodation, [k]: e.target.value } }));
  const setAct = (k) => (e) => setNewActivity((a) => ({ ...a, [k]: e.target.value }));

  const addActivity = () => {
    if (!newActivity.name) return;
    setForm((f) => ({
      ...f,
      activities: [...f.activities, { id: uuidSimple(), ...newActivity }],
    }));
    setNewActivity({ name: '', time: '', duration: '', notes: '' });
  };

  const removeActivity = (id) =>
    setForm((f) => ({ ...f, activities: f.activities.filter((a) => a.id !== id) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date) return;
    const accom =
      form.accommodation.name
        ? form.accommodation
        : null;
    onSubmit({ ...form, accommodation: accom });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date & Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input" value={form.date} onChange={set('date')}
            min={trip.startDate} max={trip.endDate} required />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" value={form.location} onChange={set('location')} placeholder={trip.destination} />
        </div>
      </div>

      {/* Accommodation */}
      <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
        <legend className="text-sm font-medium text-slate-600 px-1">Accommodation</legend>
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.accommodation.name} onChange={setAccom('name')} placeholder="Hotel / Airbnb name" />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.accommodation.address} onChange={setAccom('address')} placeholder="Address" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Check-in</label>
            <input type="time" className="input" value={form.accommodation.checkIn} onChange={setAccom('checkIn')} />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input type="time" className="input" value={form.accommodation.checkOut} onChange={setAccom('checkOut')} />
          </div>
        </div>
      </fieldset>

      {/* Activities */}
      <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
        <legend className="text-sm font-medium text-slate-600 px-1">Activities</legend>

        {form.activities.length > 0 && (
          <ul className="space-y-2 mb-2">
            {form.activities.map((a) => (
              <li key={a.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                {a.time && <span className="text-blue-600 font-mono text-xs w-10">{a.time}</span>}
                <span className="flex-1 font-medium">{a.name}</span>
                {a.duration && <span className="text-slate-400 text-xs">{a.duration}m</span>}
                <button type="button" onClick={() => removeActivity(a.id)} className="text-slate-300 hover:text-red-400 transition">✕</button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input className="input col-span-2" value={newActivity.name} onChange={setAct('name')} placeholder="Activity name *" />
          <input type="time" className="input" value={newActivity.time} onChange={setAct('time')} placeholder="Time" />
          <input type="number" className="input" value={newActivity.duration} onChange={setAct('duration')} placeholder="Duration (min)" min="1" />
          <input className="input col-span-2" value={newActivity.notes} onChange={setAct('notes')} placeholder="Notes (optional)" />
        </div>
        <button
          type="button"
          onClick={addActivity}
          disabled={!newActivity.name}
          className="btn-secondary text-sm w-full justify-center"
        >
          + Add Activity
        </button>
      </fieldset>

      {/* Notes */}
      <div>
        <label className="label">Day Notes</label>
        <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} placeholder="Any notes for the day..." />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
          {loading ? 'Saving…' : '📅 Save Day'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
