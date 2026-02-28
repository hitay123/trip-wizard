import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { batchAddDays } from '../utils/api.js';
import { useChat } from '../context/ChatContext.jsx';

export default function PlanCard({ plan, tripId, messageIndex, onApproved, onDismissed }) {
  const [status, setStatus] = useState('pending'); // pending | loading | approved | dismissed
  const { notifyTripUpdated } = useChat();

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
    <div className="mt-2 border border-blue-100 rounded-xl overflow-hidden bg-blue-50/50">
      {/* Plan header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-600 text-white">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🗓️</span>
          <span className="text-xs font-semibold">{plan.title || 'Proposed Plan'}</span>
        </div>
        <span className="text-xs text-blue-200">{plan.days?.length} day{plan.days?.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Day list */}
      <div className="divide-y divide-blue-100 max-h-64 overflow-y-auto">
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
                        <span className="font-mono text-blue-500 w-10 shrink-0">{a.time}</span>
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
        <div className="px-3 py-2 text-xs text-green-700 bg-green-50 flex items-center gap-1.5">
          <span>✅</span> Plan added to itinerary!
        </div>
      ) : (
        <div className="flex gap-2 px-3 py-2 border-t border-blue-100">
          <button
            onClick={handleApprove}
            disabled={status === 'loading'}
            className="flex-1 text-xs py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-60"
          >
            {status === 'loading' ? 'Adding…' : '✅ Add to Itinerary'}
          </button>
          <button
            onClick={handleDismiss}
            disabled={status === 'loading'}
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
