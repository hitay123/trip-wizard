import { Router } from 'express';
import { verifyToken, requireTripMember } from '../middleware/auth.js';
import { getMessages, saveMessage, getTripById, isTripAdmin } from '../db/storage.js';
import { chatWithAssistant } from '../services/gemini.js';

const router = Router();

// GET /api/trips/:id/messages?type=group|ai
router.get('/:id/messages', verifyToken, requireTripMember, (req, res) => {
  try {
    const chatType = req.query.type === 'ai' ? 'ai' : 'group';
    const messages = getMessages(req.params.id, chatType);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:id/messages?type=group|ai
router.post('/:id/messages', verifyToken, requireTripMember, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

    const chatType = req.query.type === 'ai' ? 'ai' : 'group';
    const tripId = req.params.id;
    const userId = req.user.id;

    // Check if members can chat (admins always can)
    const trip = getTripById(tripId);
    const isAdmin = isTripAdmin(tripId, userId);
    if (!trip.membersCanChat && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can send messages in this trip' });
    }

    // Save user message
    const userMsg = saveMessage(tripId, userId, chatType, content.trim());

    if (chatType === 'ai') {
      // Fetch last 20 messages as history for context
      const history = getMessages(tripId, 'ai', 20).map((m) => ({
        role: m.user_id ? 'user' : 'assistant',
        content: m.content,
      }));

      const aiResponse = await chatWithAssistant({
        messages: history,
        trip,
        dayEntry: null,
        weather: null,
      });

      const aiContent = aiResponse.content || "I'm not sure how to respond to that.";
      // Save AI response with user_id = null (system message)
      const aiMsg = saveMessage(tripId, null, 'ai', aiContent);

      return res.status(201).json({
        userMessage: userMsg,
        aiMessage: aiMsg,
        plan: aiResponse.plan || null,
        plans: aiResponse.plans || null,
      });
    }

    res.status(201).json({ userMessage: userMsg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
