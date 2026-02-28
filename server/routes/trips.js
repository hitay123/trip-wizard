import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllTrips, getTripById, createTrip, updateTrip, deleteTrip,
  addDayEntry, updateDayEntry, deleteDayEntry,
  getTripMembers, isTripMember, isTripAdmin,
  createJoinRequest, getJoinRequests, resolveJoinRequest,
  createNotification,
} from '../db/storage.js';
import db from '../db/schema.js';
import {
  verifyToken, optionalAuth, requireTripMember, requireTripAdmin,
} from '../middleware/auth.js';

const router = Router();

// ── Trip search ────────────────────────────────────────────────────────────────

// GET /api/trips/search?q=name  or  ?code=ABC123
router.get('/search', optionalAuth, (req, res) => {
  try {
    const { q, code } = req.query;
    let rows;

    if (code) {
      // Exact tripCode lookup — works for public and private
      rows = db.prepare('SELECT * FROM trips WHERE trip_code = ?').all(code.toUpperCase().trim());
    } else if (q) {
      // Name search — public trips only
      rows = db.prepare(`
        SELECT * FROM trips
        WHERE visibility = 'public' AND name LIKE ?
        ORDER BY created_at DESC LIMIT 20
      `).all(`%${q}%`);
    } else {
      return res.status(400).json({ error: 'q or code query param required' });
    }

    // Return limited public info (not days, not full details)
    const results = rows.map((t) => {
      const creator = t.creator_id
        ? db.prepare('SELECT name FROM users WHERE id = ?').get(t.creator_id)
        : null;
      const memberCount = db.prepare('SELECT COUNT(*) as n FROM trip_members WHERE trip_id = ?').get(t.id).n;
      return {
        id: t.id,
        name: t.name,
        destination: t.destination.split(',')[0].trim(), // city only
        startDate: t.start_date,
        endDate: t.end_date,
        visibility: t.visibility,
        tripCode: t.trip_code,
        creatorName: creator?.name || 'Unknown',
        memberCount,
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Trips CRUD ────────────────────────────────────────────────────────────────

// GET /api/trips — own trips if authenticated, all public otherwise
router.get('/', optionalAuth, (req, res) => {
  try {
    const trips = getAllTrips(req.user?.id || null);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/:id
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const trip = getTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Private trips: only accessible to members
    if (trip.visibility === 'private') {
      const userId = req.user?.id;
      if (!userId || !isTripMember(trip.id, userId)) {
        return res.status(403).json({ error: 'This trip is private' });
      }
    }

    // Attach members list
    const members = getTripMembers(trip.id);
    res.json({ ...trip, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips
router.post('/', verifyToken, (req, res) => {
  try {
    const { name, destination, startDate, endDate, travelers, notes, visibility } = req.body;
    if (!name || !destination || !startDate || !endDate) {
      return res.status(400).json({ error: 'name, destination, startDate, endDate are required' });
    }
    const trip = createTrip({
      name, destination, startDate, endDate,
      travelers: travelers || [],
      notes: notes || '',
      visibility: visibility || 'public',
      creatorId: req.user.id,
    });
    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/trips/:id
router.put('/:id', verifyToken, requireTripAdmin, (req, res) => {
  try {
    const updated = updateTrip(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Trip not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/trips/:id
router.delete('/:id', verifyToken, requireTripAdmin, (req, res) => {
  try {
    deleteTrip(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Members ───────────────────────────────────────────────────────────────────

// GET /api/trips/:id/members
router.get('/:id/members', verifyToken, requireTripMember, (req, res) => {
  try {
    res.json(getTripMembers(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/trips/:id/members/:userId  (trip admin removes a member)
router.delete('/:id/members/:userId', verifyToken, requireTripAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Join requests ─────────────────────────────────────────────────────────────

// POST /api/trips/:id/request-join  (any logged-in user)
router.post('/:id/request-join', verifyToken, (req, res) => {
  try {
    const tripId = req.params.id;
    const userId = req.user.id;
    const trip = getTripById(tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    if (isTripMember(tripId, userId)) {
      return res.status(409).json({ error: 'Already a member' });
    }

    const existing = db.prepare(
      "SELECT id FROM join_requests WHERE trip_id = ? AND requester_id = ? AND status = 'pending'"
    ).get(tripId, userId);
    if (existing) return res.status(409).json({ error: 'Request already pending' });

    const request = createJoinRequest(tripId, userId, null);

    // Notify trip admin
    if (trip.creatorId) {
      createNotification(trip.creatorId, 'join_request', {
        tripId, tripName: trip.name,
        requesterName: req.user.name, requestId: request.id,
      });
    }

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:id/invite  (trip admin invites a user by email)
router.post('/:id/invite', verifyToken, requireTripAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const invited = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
    if (!invited) return res.status(404).json({ error: 'User not found' });

    const tripId = req.params.id;
    if (isTripMember(tripId, invited.id)) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    const request = createJoinRequest(tripId, invited.id, req.user.id);
    const trip = getTripById(tripId);

    // Notify invited user
    createNotification(invited.id, 'trip_invite', {
      tripId, tripName: trip.name,
      invitedByName: req.user.name, requestId: request.id,
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/:id/requests  (trip admin)
router.get('/:id/requests', verifyToken, requireTripAdmin, (req, res) => {
  try {
    res.json(getJoinRequests(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/trips/:id/requests/:requestId  { action: 'accept' | 'reject' }
router.patch('/:id/requests/:requestId', verifyToken, requireTripAdmin, (req, res) => {
  try {
    const { action } = req.body;
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: "action must be 'accept' or 'reject'" });
    }

    const request = db.prepare('SELECT * FROM join_requests WHERE id = ? AND trip_id = ?').get(
      req.params.requestId, req.params.id
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const status = action === 'accept' ? 'accepted' : 'rejected';
    resolveJoinRequest(request.id, status);

    if (action === 'accept') {
      db.prepare('INSERT OR IGNORE INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)').run(
        req.params.id, request.requester_id, 'member'
      );
      const trip = getTripById(req.params.id);
      createNotification(request.requester_id, 'request_accepted', {
        tripId: req.params.id, tripName: trip.name,
      });
    } else {
      const trip = getTripById(req.params.id);
      createNotification(request.requester_id, 'request_rejected', {
        tripId: req.params.id, tripName: trip.name,
      });
    }

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Days ──────────────────────────────────────────────────────────────────────

router.post('/:id/days', verifyToken, requireTripMember, (req, res) => {
  try {
    const { date, location, accommodation, activities, notes } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });
    const trip = getTripById(req.params.id);
    const day = addDayEntry(req.params.id, {
      id: uuidv4(), date,
      location: location || trip.destination,
      accommodation: accommodation || null,
      activities: activities || [], notes: notes || '',
    });
    res.status(201).json(day);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/days/:dayId', verifyToken, requireTripMember, (req, res) => {
  try {
    const updated = updateDayEntry(req.params.id, req.params.dayId, req.body);
    if (!updated) return res.status(404).json({ error: 'Day not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/days/batch', verifyToken, requireTripMember, (req, res) => {
  try {
    const { days } = req.body;
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: 'days array is required' });
    }
    const trip = getTripById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const added = [];
    for (const day of days) {
      if (!day.date) continue;
      added.push(addDayEntry(req.params.id, {
        id: uuidv4(), date: day.date,
        location: day.location || trip.destination,
        accommodation: day.accommodation?.name ? day.accommodation : null,
        activities: (day.activities || []).map((a) => ({ id: uuidv4(), ...a })),
        notes: day.notes || '',
      }));
    }
    res.status(201).json({ added, count: added.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/days/:dayId', verifyToken, requireTripMember, (req, res) => {
  try {
    const deleted = deleteDayEntry(req.params.id, req.params.dayId);
    if (!deleted) return res.status(404).json({ error: 'Day not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
