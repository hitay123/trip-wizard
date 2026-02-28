import React, { useState } from 'react';
import { optimizeSchedule } from '../utils/api.js';

const CROWD_COLOR = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const WEATHER_ICON = {
  high: '☀️',
  medium: '⛅',
  low: '🌧️',
};

function TimelineItem({ item, index }) {
  return (
    <div className="timeline-item flex gap-3" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Time column */}
      <div className="w-14 text-right shrink-0">
        <span className="text-sm font-mono font-semibold text-blue-600">{item.time}</span>
      </div>

      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-white ring-offset-1 shrink-0 mt-0.5" />
        <div className="flex-1 w-px bg-slate-200 my-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-slate-800">{item.activity}</p>
              {item.duration && (
                <p className="text-xs text-slate-400 mt-0.5">⏱ {item.duration} min</p>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {item.weatherSuitability && (
                <span title={`Weather: ${item.weatherSuitability}`} className="text-sm">
                  {WEATHER_ICON[item.weatherSuitability]}
                </span>
              )}
              {item.crowdLevel && (
                <span className={`badge ${CROWD_COLOR[item.crowdLevel]}`}>
                  {item.crowdLevel}
                </span>
              )}
            </div>
          </div>
          {item.notes && (
            <p className="text-xs text-slate-500 mt-2 border-t border-slate-50 pt-2">{item.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ManualTimeline({ day }) {
  const sorted = [...(day.activities || [])].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No activities added yet. Add activities to see your timeline.
      </p>
    );
  }

  return (
    <div>
      {sorted.map((a, i) => (
        <TimelineItem
          key={a.id}
          index={i}
          item={{
            time: a.time || '—',
            activity: a.name,
            duration: a.duration,
            notes: a.notes,
          }}
        />
      ))}
    </div>
  );
}

export default function Timeline({ day, tripId }) {
  const [optimized, setOptimized] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await optimizeSchedule(tripId, day.id);
      setOptimized(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasActivities = (day.activities?.length || 0) > 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Daily Timeline</h3>
        {hasActivities && (
          <button
            onClick={optimized ? () => setOptimized(null) : handleOptimize}
            disabled={loading}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {loading ? '⏳ Optimizing…' : optimized ? '📋 Manual order' : '✨ AI Optimize'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {optimized ? (
        <div className="space-y-1">
          {optimized.summary && (
            <div className="bg-blue-50 rounded-xl px-3 py-2 mb-3">
              <p className="text-xs text-blue-700">{optimized.summary}</p>
            </div>
          )}
          {optimized.optimizedSchedule?.map((item, i) => (
            <TimelineItem key={i} index={i} item={item} />
          ))}
          {optimized.tips?.length > 0 && (
            <div className="mt-2 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-1.5">💡 Tips</p>
              <ul className="space-y-1">
                {optimized.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-slate-500">• {tip}</li>
                ))}
              </ul>
            </div>
          )}
          {optimized.isMock && (
            <p className="text-xs text-amber-600 mt-2">⚠️ Demo optimization — add Anthropic API key for AI-powered scheduling</p>
          )}
        </div>
      ) : (
        <ManualTimeline day={day} />
      )}
    </div>
  );
}
