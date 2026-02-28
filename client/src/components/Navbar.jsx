import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import TripForm from './TripForm';
import { createTrip } from '../utils/api';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isExplore = location.pathname === '/explore';
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreate = async (data) => {
    setCreating(true);
    try {
      const trip = await createTrip(data);
      setShowModal(false);
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create trip');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-blue-600 text-lg tracking-tight">
            <span className="text-2xl">🧙</span>
            <span>Trip Wizard</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/explore"
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition ${
                isExplore
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              🔍 <span>Explore</span>
            </Link>

            <Link
              to="/search"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
            >
              ✈️ <span>Find Trip</span>
            </Link>

            {user && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
                title="Create a new trip"
              >
                <span className="text-base leading-none">+</span>
                <span>New Trip</span>
              </button>
            )}

            {user ? (
              <>
                <NotificationBell />
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-sm px-3 py-1.5 rounded-lg text-purple-600 hover:bg-purple-50 font-medium transition"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-2 ml-1">
                  <span className="text-sm text-slate-600 font-medium">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-slate-400 hover:text-slate-700 px-2 py-1 rounded transition"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  to="/login"
                  className="text-sm px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* New Trip Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <h2 className="text-xl font-bold text-slate-800">✈️ New Trip</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none transition"
              >
                ×
              </button>
            </div>
            <div className="px-6 pb-6">
              <TripForm onSubmit={handleCreate} onCancel={() => setShowModal(false)} loading={creating} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
