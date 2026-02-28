import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import TripDetail from './pages/TripDetail.jsx';
import DayPage from './pages/DayPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import Navbar from './components/Navbar.jsx';
import FloatingChat from './components/FloatingChat.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/trips/:tripId" element={<TripDetail />} />
              <Route path="/trips/:tripId/days/:dayId" element={<DayPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <FloatingChat />
        </div>
      </ChatProvider>
    </AuthProvider>
  );
}
