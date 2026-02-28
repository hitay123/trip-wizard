import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead } from '../utils/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      // not logged in
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const handleClick = async (n) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    setOpen(false);
    if (n.payload?.tripId) navigate(`/trips/${n.payload.tripId}`);
  };

  const labelFor = (n) => {
    const { type, payload } = n;
    if (type === 'join_request') return `${payload.requesterName} wants to join "${payload.tripName}"`;
    if (type === 'trip_invite') return `${payload.invitedByName} invited you to "${payload.tripName}"`;
    if (type === 'request_accepted') return `Your request to join "${payload.tripName}" was accepted!`;
    if (type === 'request_rejected') return `Your request to join "${payload.tripName}" was declined.`;
    return 'New notification';
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-medium text-sm text-slate-700">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400 text-center">No notifications yet</div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition text-sm ${
                    n.read ? 'text-slate-500' : 'text-slate-800 font-medium'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{!n.read ? '🔵' : '⚪'}</span>
                    <span>{labelFor(n)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 ml-5">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
