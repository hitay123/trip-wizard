import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { batchAddDays } from '../utils/api.js';
import { useChat } from '../context/ChatContext.jsx';

// Color themes for plan labels (cycles through if more than 3)
const LABEL_COLORS = [
  { bg: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-100' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { bg: 'bg-purple-600', light: 'bg-purple-50 text-purple-700 border-purple-100' },
];

export default function PlanCard({ plan, label, colorIndex = 0, tripId, messageIndex, onApproved, onDismissed }) {
  const [status, setStatus] = useState('pending'); // pending | loading | approved | dismissed
  const { notifyTripUpdated } = useChat();
  const color = LABEL_COLORS[colorIndex % LABEL_COLORS.length];

  const handleApprove = async () => {
    if (!tripId) {
      alert('Navigate to a trip first so the plan knows where to be added.');
      return;
    }
    setStatus('loading');
    try {
      await batchAddDays(tripId, plan.days);
      setStatus('approved');
      notifyTripUpdated();
      onApproved?.();
    } catch (err) {
      setStatus('pending');
      alert('Failed to add plan: ' + err.message);
    }
  };

  const handleDismiss = () => {
    setStatus('dismissed');
    onDismissed?.();
  };

  if (status === 'dismissed') return null;

  return (
    <div className={`mt-2 border rounded-xl overflow-hidden ${color.light}`}>
      {/* Plan header */}
      <div className={`flex items-center justify-between px-3 py-2 ${color.bg} text-white`}>
        <div className="flex items-center gap-1.5">
          <span className="text-base">🗓️</span>
          <div>
            {label && <span className="text-xs font-bold opacity-90 block leading-tight">{label}</span>}
            <span className="text-xs font-medium opacity-80">{plan.title || 'Proposed Plan'}</span>
          </div>
        </div>
        <span className="text-xs opacity-70">{plan.days?.length} day{plan.days?.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Day list */}
      <div className="divide-y divide-current/10 max-h-56 overflow-y-auto bg-white/60">
        {plan.days?.map((day, i) => {
          let label = day.date;
          try { label = format(parseISO(day.date), 'EEE, MMM d'); } catch {}
          return (
            <div key={i} className="px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{label}</span>
                <span className="text-xs text-slate-400">{day.location}</span>
              </div>
              {day.notes && (
                <p className="text-xs text-slate-500 mt-0.5 italic">{day.notes}</p>
              )}
              {day.activities?.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {day.activities.map((a, j) => (
                    <li key={j} className="flex items-center gap-1.5 text-xs text-slate-600">
                      {a.time && (
                        <span className="font-mono text-slate-500 w-10 shrink-0">{a.time}</span>
                      )}
                      <span className="truncate">{a.name}</span>
                      {a.duration && (
                        <span className="text-slate-400 shrink-0">{a.duration}m</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {status === 'approved' ? (
        <div className="px-3 py-2 text-xs text-green-700 bg-green-50 flex items-center gap-1.5 border-t border-green-100">
          <span>✅</span> Added to itinerary!
        </div>
      ) : (
        <div className="flex gap-2 px-3 py-2 border-t border-current/10 bg-white/40">
          <button
            onClick={handleApprove}
            disabled={status === 'loading'}
            className={`flex-1 text-xs py-1.5 ${color.bg} hover:opacity-90 text-white rounded-lg font-medium transition disabled:opacity-60`}
          >
            {status === 'loading' ? 'Adding…' : '+ Add to Itinerary'}
          </button>
          <button
            onClick={handleDismiss}
            disabled={status === 'loading'}
            className="text-xs px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-500 rounded-lg border border-slate-200 transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
