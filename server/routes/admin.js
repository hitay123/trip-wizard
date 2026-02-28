import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { getAllUsers, getAllTrips, deleteTrip, deleteUser } from '../db/storage.js';
import db from '../db/schema.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(verifyToken, requireAdmin);

// GET /api/admin/users
router.get('/users', (req, res) => {
  try {
    res.json(getAllUsers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/trips
router.get('/trips', (req, res) => {
  try {
    res.json(getAllTrips());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/trips/:id
router.delete('/trips/:id', (req, res) => {
  try {
    deleteTrip(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics
router.get('/analytics', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
    const totalTrips = db.prepare('SELECT COUNT(*) as n FROM trips').get().n;
    const publicTrips = db.prepare("SELECT COUNT(*) as n FROM trips WHERE visibility = 'public'").get().n;
    const privateTrips = db.prepare("SELECT COUNT(*) as n FROM trips WHERE visibility = 'private'").get().n;
    const totalMessages = db.prepare('SELECT COUNT(*) as n FROM messages').get().n;
    const tripsThisWeek = db.prepare(
      "SELECT COUNT(*) as n FROM trips WHERE created_at >= datetime('now', '-7 days')"
    ).get().n;
    const usersThisWeek = db.prepare(
      "SELECT COUNT(*) as n FROM users WHERE created_at >= datetime('now', '-7 days')"
    ).get().n;

    res.json({
      totalUsers,
      totalTrips,
      publicTrips,
      privateTrips,
      totalMessages,
      tripsThisWeek,
      usersThisWeek,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
