import React, { useState } from 'react';

const EMPTY_FORM = {
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  travelers: '',
  notes: '',
  visibility: 'public',
};

export default function TripForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.destination || !form.startDate || !form.endDate) return;
    onSubmit({
      ...form,
      travelers: form.travelers
        ? form.travelers.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Trip Name *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Summer in Europe" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Destination *</label>
          <input className="input" value={form.destination} onChange={set('destination')} placeholder="e.g. Paris, France" required />
        </div>
        <div>
          <label className="label">Start Date *</label>
          <input type="date" className="input" value={form.startDate} onChange={set('startDate')} required />
        </div>
        <div>
          <label className="label">End Date *</label>
          <input type="date" className="input" value={form.endDate} onChange={set('endDate')} min={form.startDate} required />
        </div>
        <div>
          <label className="label">Visibility</label>
          <select className="input" value={form.visibility} onChange={set('visibility')}>
            <option value="public">🌐 Public</option>
            <option value="private">🔒 Private</option>
          </select>
        </div>
        <div>
          <label className="label">Travelers (comma-separated)</label>
          <input className="input" value={form.travelers} onChange={set('travelers')} placeholder="Alice, Bob…" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} placeholder="Any notes about the trip..." />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
          {loading ? 'Creating…' : '✨ Create Trip'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
