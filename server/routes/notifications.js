import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getNotifications, markNotificationRead } from '../db/storage.js';

const router = Router();

// GET /api/notifications
router.get('/', verifyToken, (req, res) => {
  try {
    const notifications = getNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', verifyToken, (req, res) => {
  try {
    markNotificationRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
