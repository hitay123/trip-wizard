import React, { useEffect, useState } from 'react';
import { adminGetUsers, adminDeleteUser, adminGetTrips, adminDeleteTrip, adminGetAnalytics } from '../utils/api';

export default function AdminPage() {
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [a, u, t] = await Promise.all([adminGetAnalytics(), adminGetUsers(), adminGetTrips()]);
        setAnalytics(a);
        setUsers(u);
        setTrips(t);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await adminDeleteUser(id);
    setUsers((u) => u.filter((x) => x.id !== id));
  };

  const handleDeleteTrip = async (id) => {
    if (!confirm('Delete this trip?')) return;
    await adminDeleteTrip(id);
    setTrips((t) => t.filter((x) => x.id !== id));
  };

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Admin Panel</h1>

      <div className="flex gap-2 mb-6 border-b border-slate-100">
        {['analytics', 'users', 'trips'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'analytics' && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: analytics.totalUsers },
            { label: 'New Users (7d)', value: analytics.usersThisWeek },
            { label: 'Total Trips', value: analytics.totalTrips },
            { label: 'New Trips (7d)', value: analytics.tripsThisWeek },
            { label: 'Public Trips', value: analytics.publicTrips },
            { label: 'Private Trips', value: analytics.privateTrips },
            { label: 'Total Messages', value: analytics.totalMessages },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-slate-800">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{u.created_at?.split('T')[0]}</td>
                  <td className="px-4 py-3">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'trips' && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Destination</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Visibility</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 text-slate-500">{t.destination}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      t.visibility === 'public' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>{t.visibility}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.tripCode}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{t.createdAt?.split('T')[0]}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteTrip(t.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
