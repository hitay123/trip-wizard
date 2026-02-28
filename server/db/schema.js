import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/tripwizard.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    travelers TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'public',
    trip_code TEXT UNIQUE,
    creator_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_trips_trip_code ON trips(trip_code);
  CREATE INDEX IF NOT EXISTS idx_trips_creator ON trips(creator_id);

  CREATE TABLE IF NOT EXISTS days (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    accommodation TEXT NOT NULL DEFAULT 'null',
    activities TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trip_members (
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (trip_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS join_requests (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by TEXT REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    chat_type TEXT NOT NULL DEFAULT 'group',
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Trip code generator ────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O, 0, I, 1 (ambiguous)

export function generateTripCode() {
  let code;
  const check = db.prepare('SELECT id FROM trips WHERE trip_code = ?');
  do {
    code = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  } while (check.get(code));
  return code;
}

// ── One-time JSON migration ────────────────────────────────────────────────────

const tripCount = db.prepare('SELECT COUNT(*) as n FROM trips').get().n;
if (tripCount === 0) {
  const jsonPath = join(__dirname, '../../data/trips.json');
  if (existsSync(jsonPath)) {
    try {
      const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
      const trips = Array.isArray(raw) ? raw : raw.trips || [];

      const insertTrip = db.prepare(`
        INSERT OR IGNORE INTO trips (id, name, destination, start_date, end_date, travelers, notes, visibility, trip_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'public', ?, ?, ?)
      `);
      const insertDay = db.prepare(`
        INSERT OR IGNORE INTO days (id, trip_id, date, location, accommodation, activities, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      db.transaction(() => {
        for (const trip of trips) {
          insertTrip.run(
            trip.id, trip.name, trip.destination, trip.startDate, trip.endDate,
            JSON.stringify(trip.travelers || []), trip.notes || '',
            generateTripCode(),
            trip.createdAt || new Date().toISOString(),
            trip.updatedAt || new Date().toISOString()
          );
          for (const day of trip.days || []) {
            insertDay.run(
              day.id, trip.id, day.date, day.location || trip.destination,
              JSON.stringify(day.accommodation ?? null),
              JSON.stringify(day.activities || []),
              day.notes || ''
            );
          }
        }
      })();

      console.log(`[DB] Migrated ${trips.length} trips from trips.json → SQLite`);
    } catch (e) {
      console.warn('[DB] JSON migration skipped:', e.message);
    }
  }
}

export default db;
