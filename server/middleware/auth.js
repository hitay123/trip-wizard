import jwt from 'jsonwebtoken';
import db from '../db/schema.js';

export function verifyToken(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.userId);
      if (user) req.user = user;
    } catch { /* not authenticated, continue */ }
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

export function requireTripAccess(req, res, next) {
  const tripId = req.params.id || req.params.tripId;
  const trip = db.prepare('SELECT creator_id, visibility FROM trips WHERE id = ?').get(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const userId = req.user?.id;
  const isMember = userId && (
    trip.creator_id === userId ||
    !!db.prepare('SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?').get(tripId, userId)
  );

  req.trip = trip;
  req.isTripMember = isMember;
  next();
}

export function requireTripMember(req, res, next) {
  requireTripAccess(req, res, () => {
    if (!req.isTripMember) return res.status(403).json({ error: 'Trip membership required' });
    next();
  });
}

export function requireTripAdmin(req, res, next) {
  const tripId = req.params.id || req.params.tripId;
  const trip = db.prepare('SELECT creator_id FROM trips WHERE id = ?').get(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const userId = req.user?.id;
  const isAdmin = trip.creator_id === userId ||
    db.prepare("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ? AND role = 'admin'").get(tripId, userId);

  if (!isAdmin) return res.status(403).json({ error: 'Trip admin access required' });
  next();
}
