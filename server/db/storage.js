import { v4 as uuidv4 } from 'uuid';
import db, { generateTripCode } from './schema.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDay(row) {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.date,
    location: row.location,
    accommodation: JSON.parse(row.accommodation),
    activities: JSON.parse(row.activities),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getDays(tripId) {
  return db.prepare('SELECT * FROM days WHERE trip_id = ? ORDER BY date ASC').all(tripId).map(fmtDay);
}

function fmtTrip(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    travelers: JSON.parse(row.travelers),
    notes: row.notes,
    visibility: row.visibility,
    tripCode: row.trip_code,
    creatorId: row.creator_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    days: getDays(row.id),
  };
}

// ── Trips ─────────────────────────────────────────────────────────────────────

export function getAllTrips(userId = null) {
  let rows;
  if (userId) {
    rows = db.prepare(`
      SELECT DISTINCT t.* FROM trips t
      LEFT JOIN trip_members tm ON t.id = tm.trip_id
      WHERE t.creator_id = ? OR tm.user_id = ?
      ORDER BY t.created_at DESC
    `).all(userId, userId);
  } else {
    rows = db.prepare('SELECT * FROM trips ORDER BY created_at DESC').all();
  }
  return rows.map(fmtTrip);
}

export function getTripById(id) {
  return fmtTrip(db.prepare('SELECT * FROM trips WHERE id = ?').get(id));
}

export function createTrip(data) {
  const id = data.id || uuidv4();
  const code = generateTripCode();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO trips (id, name, destination, start_date, end_date, travelers, notes, visibility, trip_code, creator_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.destination, data.startDate, data.endDate,
    JSON.stringify(data.travelers || []), data.notes || '',
    data.visibility || 'public', code, data.creatorId || null, now, now
  );

  // Auto-add creator as trip admin member
  if (data.creatorId) {
    db.prepare('INSERT OR IGNORE INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)').run(id, data.creatorId, 'admin');
  }

  return getTripById(id);
}

export function updateTrip(id, data) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE trips
    SET name=?, destination=?, start_date=?, end_date=?, travelers=?, notes=?, visibility=?, updated_at=?
    WHERE id=?
  `).run(
    data.name, data.destination, data.startDate, data.endDate,
    JSON.stringify(data.travelers || []), data.notes || '',
    data.visibility || 'public', now, id
  );
  return getTripById(id);
}

export function deleteTrip(id) {
  const info = db.prepare('DELETE FROM trips WHERE id = ?').run(id);
  return info.changes > 0;
}

// ── Days ──────────────────────────────────────────────────────────────────────

export function addDayEntry(tripId, data) {
  const id = data.id || uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO days (id, trip_id, date, location, accommodation, activities, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, tripId, data.date, data.location || '',
    JSON.stringify(data.accommodation ?? null),
    JSON.stringify(data.activities || []),
    data.notes || '', now, now
  );
  return fmtDay(db.prepare('SELECT * FROM days WHERE id = ?').get(id));
}

export function updateDayEntry(tripId, dayId, data) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE days
    SET date=?, location=?, accommodation=?, activities=?, notes=?, updated_at=?
    WHERE id=? AND trip_id=?
  `).run(
    data.date, data.location || '',
    JSON.stringify(data.accommodation ?? null),
    JSON.stringify(data.activities || []),
    data.notes || '', now, dayId, tripId
  );
  return fmtDay(db.prepare('SELECT * FROM days WHERE id = ?').get(dayId));
}

export function deleteDayEntry(tripId, dayId) {
  const info = db.prepare('DELETE FROM days WHERE id = ? AND trip_id = ?').run(dayId, tripId);
  return info.changes > 0;
}

// ── Members ───────────────────────────────────────────────────────────────────

export function getTripMembers(tripId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, tm.role, tm.joined_at
    FROM trip_members tm JOIN users u ON tm.user_id = u.id
    WHERE tm.trip_id = ?
    ORDER BY tm.joined_at ASC
  `).all(tripId);
}

export function isTripMember(tripId, userId) {
  const trip = db.prepare('SELECT creator_id FROM trips WHERE id = ?').get(tripId);
  if (!trip) return false;
  if (trip.creator_id === userId) return true;
  return !!db.prepare('SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?').get(tripId, userId);
}

export function isTripAdmin(tripId, userId) {
  const trip = db.prepare('SELECT creator_id FROM trips WHERE id = ?').get(tripId);
  if (!trip) return false;
  if (trip.creator_id === userId) return true;
  const m = db.prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?').get(tripId, userId);
  return m?.role === 'admin';
}

// ── Join requests ─────────────────────────────────────────────────────────────

export function createJoinRequest(tripId, requesterId, invitedBy = null) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO join_requests (id, trip_id, requester_id, invited_by, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(id, tripId, requesterId, invitedBy);
  return db.prepare('SELECT * FROM join_requests WHERE id = ?').get(id);
}

export function getJoinRequests(tripId) {
  return db.prepare(`
    SELECT jr.*, u.name as requester_name, u.email as requester_email,
           inv.name as invited_by_name
    FROM join_requests jr
    JOIN users u ON jr.requester_id = u.id
    LEFT JOIN users inv ON jr.invited_by = inv.id
    WHERE jr.trip_id = ?
    ORDER BY jr.created_at DESC
  `).all(tripId);
}

export function resolveJoinRequest(requestId, action) {
  db.prepare("UPDATE join_requests SET status = ? WHERE id = ?").run(action, requestId);
  return db.prepare('SELECT * FROM join_requests WHERE id = ?').get(requestId);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function createNotification(userId, type, payload = {}) {
  const id = uuidv4();
  db.prepare('INSERT INTO notifications (id, user_id, type, payload) VALUES (?, ?, ?, ?)').run(
    id, userId, type, JSON.stringify(payload)
  );
}

export function getNotifications(userId) {
  return db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId)
    .map(n => ({ ...n, payload: JSON.parse(n.payload), read: !!n.read }));
}

export function markNotificationRead(id, userId) {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
}

// ── Messages ──────────────────────────────────────────────────────────────────

export function getMessages(tripId, chatType, limit = 50) {
  return db.prepare(`
    SELECT m.*, u.name as user_name
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.trip_id = ? AND m.chat_type = ?
    ORDER BY m.created_at ASC
    LIMIT ?
  `).all(tripId, chatType, limit);
}

export function saveMessage(tripId, userId, chatType, content) {
  const id = uuidv4();
  db.prepare('INSERT INTO messages (id, trip_id, user_id, chat_type, content) VALUES (?, ?, ?, ?, ?)').run(
    id, tripId, userId, chatType, content
  );
  return db.prepare(`
    SELECT m.*, u.name as user_name
    FROM messages m LEFT JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(id);
}

// ── Users (for admin) ─────────────────────────────────────────────────────────

export function getAllUsers() {
  return db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
}

export function deleteUser(id) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
