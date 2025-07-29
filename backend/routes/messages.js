
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// Utility: always order user IDs to ensure unique conversation pairs
function getOrderedUserIds(userId1, userId2) {
    return [Math.min(userId1, userId2), Math.max(userId1, userId2)];
}

// List all conversations for the logged-in user
router.get('/conversations', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const [convos] = await db.query(
            `SELECT c.id, c.user1_id, c.user2_id, c.created_at,
                    u1.full_name AS user1_name, u2.full_name AS user2_name
             FROM conversations c
             JOIN users u1 ON c.user1_id = u1.id
             JOIN users u2 ON c.user2_id = u2.id
             WHERE c.user1_id = ? OR c.user2_id = ?
             ORDER BY c.created_at DESC`,
            [userId, userId]
        );
        res.json(convos);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ message: 'Server error while fetching conversations.' });
    }
});

// Get all messages in a conversation
router.get('/conversations/:conversationId', protect, async (req, res) => {
    const { conversationId } = req.params;
    try {
        // Check if user is a participant
        const [rows] = await db.query(
            'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [conversationId, req.user.id, req.user.id]
        );
        if (rows.length === 0) {
            return res.status(403).json({ message: 'Access denied to this conversation.' });
        }
        const [messages] = await db.query(
            `SELECT m.id, m.sender_id, u.full_name AS sender_name, m.message, m.sent_at, m.read_status
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = ?
             ORDER BY m.sent_at ASC`,
            [conversationId]
        );
        res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ message: 'Server error while fetching messages.' });
    }
});

// Start a new conversation or get existing (returns conversation ID)
router.post('/start', protect, async (req, res) => {
    const { other_user_id } = req.body;
    const userId = req.user.id;
    if (!other_user_id || other_user_id === userId) {
        return res.status(400).json({ message: 'Invalid user selected.' });
    }
    const [id1, id2] = getOrderedUserIds(userId, other_user_id);
    try {
        // Check if conversation exists
        const [existing] = await db.query(
            'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?',
            [id1, id2]
        );
        if (existing.length > 0) {
            return res.json({ conversation_id: existing[0].id });
        }
        // Create new conversation
        const [result] = await db.query(
            'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)',
            [id1, id2]
        );
        res.status(201).json({ conversation_id: result.insertId });
    } catch (err) {
        console.error('Error starting conversation:', err);
        res.status(500).json({ message: 'Server error while starting conversation.' });
    }
});

// Send a message in a conversation
router.post('/conversations/:conversationId', protect, async (req, res) => {
    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    if (!message) {
        return res.status(400).json({ message: 'Message cannot be empty.' });
    }
    try {
        // Check if user is a participant
        const [rows] = await db.query(
            'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [conversationId, userId, userId]
        );
        if (rows.length === 0) {
            return res.status(403).json({ message: 'Access denied to this conversation.' });
        }
        await db.query(
            'INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)',
            [conversationId, userId, message]
        );
        res.status(201).json({ message: 'Message sent.' });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: 'Server error while sending message.' });
    }
});

// Mark a message as read
router.patch('/messages/:messageId/read', protect, async (req, res) => {
    const { messageId } = req.params;
    try {
        // Only allow if user is a participant in the conversation
        const [msgRows] = await db.query(
            'SELECT m.*, c.user1_id, c.user2_id FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE m.id = ?',
            [messageId]
        );
        if (msgRows.length === 0) {
            return res.status(404).json({ message: 'Message not found.' });
        }
        const msg = msgRows[0];
        if (msg.user1_id !== req.user.id && msg.user2_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized.' });
        }
        await db.query('UPDATE messages SET read_status = TRUE WHERE id = ?', [messageId]);
        res.json({ message: 'Message marked as read.' });
    } catch (err) {
        console.error('Error marking message as read:', err);
        res.status(500).json({ message: 'Server error while marking message as read.' });
    }
});

// Get unread message count for current user
router.get('/unread-count', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const [result] = await db.query(
            `SELECT COUNT(*) as unread_count 
             FROM messages m 
             JOIN conversations c ON m.conversation_id = c.id 
             WHERE (c.user1_id = ? OR c.user2_id = ?) 
             AND m.sender_id != ? 
             AND m.read_status = FALSE`,
            [userId, userId, userId]
        );
        res.json({ unread_count: result[0].unread_count });
    } catch (err) {
        console.error('Error fetching unread count:', err);
        res.status(500).json({ message: 'Server error while fetching unread count.' });
    }
});

// Mark all messages in a conversation as read
router.patch('/conversations/:conversationId/read', protect, async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;
    
    try {
        // Check if user is a participant
        const [rows] = await db.query(
            'SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
            [conversationId, userId, userId]
        );
        if (rows.length === 0) {
            return res.status(403).json({ message: 'Access denied to this conversation.' });
        }
        
        // Mark all messages in conversation as read (except user's own messages)
        await db.query(
            'UPDATE messages SET read_status = TRUE WHERE conversation_id = ? AND sender_id != ?',
            [conversationId, userId]
        );
        
        res.json({ message: 'Messages marked as read.' });
    } catch (err) {
        console.error('Error marking conversation as read:', err);
        res.status(500).json({ message: 'Server error while marking conversation as read.' });
    }
});

// Get message count for current user
router.get('/count', protect, async (req, res) => {
    try {
        const [result] = await db.query(
            "SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE (c.user1_id = ? OR c.user2_id = ?)",
            [req.user.id, req.user.id]
        );
        res.json({ count: result[0].count });
    } catch (err) {
        console.error('Error fetching message count:', err);
        res.status(500).json({ message: 'Server error while fetching message count.' });
    }
});

module.exports = router;