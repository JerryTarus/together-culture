const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/messages/conversations - Get user's conversations
router.get('/conversations', protect, async (req, res) => {
    try {
        const [conversations] = await db.query(
            `SELECT DISTINCT 
                c.id,
                c.title,
                c.created_at,
                c.updated_at
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            WHERE cp.user_id = ?
            ORDER BY c.updated_at DESC`,
            [req.user.id]
        );

        // Get participants for each conversation
        for (let conversation of conversations) {
            const [participants] = await db.query(
                `SELECT 
                    u.id,
                    u.full_name,
                    u.email
                FROM users u
                JOIN conversation_participants cp ON u.id = cp.user_id
                WHERE cp.conversation_id = ?`,
                [conversation.id]
            );
            conversation.participants = participants;

            // Get last message
            const [lastMessage] = await db.query(
                `SELECT 
                    m.content,
                    m.created_at,
                    u.full_name as sender_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = ?
                ORDER BY m.created_at DESC
                LIMIT 1`,
                [conversation.id]
            );
            conversation.last_message = lastMessage[0] || null;
        }

        res.json({ conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Error fetching conversations' });
    }
});

// GET /api/messages/conversations/:id/messages - Get messages for a conversation
router.get('/conversations/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify user is participant in conversation
        const [participant] = await db.query(
            'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (participant.length === 0) {
            return res.status(403).json({ message: 'Access denied to this conversation' });
        }

        const [messages] = await db.query(
            `SELECT 
                m.id,
                m.content,
                m.sender_id,
                m.created_at,
                u.full_name as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC`,
            [id]
        );

        res.json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// POST /api/messages/conversations/:id/messages - Send message to conversation
router.post('/conversations/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        // Verify user is participant in conversation
        const [participant] = await db.query(
            'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (participant.length === 0) {
            return res.status(403).json({ message: 'Access denied to this conversation' });
        }

        // Insert message
        const [result] = await db.query(
            'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
            [id, req.user.id, content.trim()]
        );

        // Update conversation timestamp
        await db.query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
            [id]
        );

        res.status(201).json({
            message: 'Message sent successfully',
            message_id: result.insertId
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
});

// GET /api/messages/users - Get list of users to start conversations with
router.get('/users', protect, async (req, res) => {
    try {
        const { search = '' } = req.query;
        const userId = req.user.id;

        let whereClause = 'WHERE u.id != ? AND u.status = "approved"';
        let queryParams = [userId];

        if (search) {
            whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm);
        }

        const [users] = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.role,
                -- Check if direct conversation exists
                CASE WHEN dm.conversation_id IS NOT NULL THEN dm.conversation_id ELSE NULL END as existing_conversation_id
            FROM users u
            LEFT JOIN (
                SELECT 
                    c.id as conversation_id,
                    CASE 
                        WHEN cp1.user_id = ? THEN cp2.user_id
                        ELSE cp1.user_id
                    END as other_user_id
                FROM conversations c
                JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
                JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
                WHERE c.type = 'direct'
                AND (cp1.user_id = ? OR cp2.user_id = ?)
                AND cp1.user_id != cp2.user_id
                AND (
                    SELECT COUNT(*) 
                    FROM conversation_participants 
                    WHERE conversation_id = c.id
                ) = 2
            ) dm ON u.id = dm.other_user_id
            ${whereClause}
            ORDER BY u.full_name
            LIMIT 50
        `, [userId, userId, userId, ...queryParams]);

        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// PUT /api/messages/conversations/:id - Update conversation (name, add/remove participants)
router.put('/conversations/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, add_participants = [], remove_participants = [] } = req.body;
        const userId = req.user.id;

        // Check if user is participant and get conversation info
        const [conversation] = await db.query(`
            SELECT c.*, cp.user_id
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            WHERE c.id = ? AND cp.user_id = ?
        `, [id, userId]);

        if (conversation.length === 0) {
            return res.status(403).json({ message: 'You are not a participant in this conversation' });
        }

        const conv = conversation[0];

        // Only allow updating group conversations
        if (conv.type !== 'group') {
            return res.status(400).json({ message: 'Only group conversations can be updated' });
        }

        // Update name if provided
        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ 
                    message: 'Group name cannot be empty',
                    errors: { name: 'Name is required' }
                });
            }

            await db.query(
                'UPDATE conversations SET name = ?, updated_at = NOW() WHERE id = ?',
                [name.trim(), id]
            );
        }

        // Add participants
        if (add_participants.length > 0) {
            // Validate new participants exist and are approved
            const [users] = await db.query(
                `SELECT id FROM users WHERE id IN (${add_participants.map(() => '?').join(',')}) AND status = 'approved'`,
                add_participants
            );

            if (users.length !== add_participants.length) {
                return res.status(400).json({ 
                    message: 'Some participants not found or not approved',
                    errors: { add_participants: 'Invalid or unapproved participants' }
                });
            }

            // Check if any are already participants
            const [existing] = await db.query(
                `SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id IN (${add_participants.map(() => '?').join(',')})`,
                [id, ...add_participants]
            );

            const existingIds = existing.map(p => p.user_id);
            const newParticipants = add_participants.filter(id => !existingIds.includes(id));

            if (newParticipants.length > 0) {
                const participantValues = newParticipants.map(userId => [id, userId]);
                await db.query(
                    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?',
                    [participantValues]
                );
            }
        }

        // Remove participants (cannot remove self or if it would leave conversation empty)
        if (remove_participants.length > 0) {
            if (remove_participants.includes(userId)) {
                return res.status(400).json({ 
                    message: 'Cannot remove yourself from conversation',
                    errors: { remove_participants: 'Cannot remove self' }
                });
            }

            // Get current participant count
            const [participantCount] = await db.query(
                'SELECT COUNT(*) as count FROM conversation_participants WHERE conversation_id = ?',
                [id]
            );

            if (participantCount[0].count - remove_participants.length < 2) {
                return res.status(400).json({ 
                    message: 'Cannot remove participants - conversation must have at least 2 participants',
                    errors: { remove_participants: 'Would leave conversation empty' }
                });
            }

            await db.query(
                `DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id IN (${remove_participants.map(() => '?').join(',')})`,
                [id, ...remove_participants]
            );
        }

        // Get updated conversation
        const [updatedConversation] = await db.query(`
            SELECT 
                c.*,
                GROUP_CONCAT(u.full_name ORDER BY u.full_name) as participants
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            JOIN users u ON cp.user_id = u.id
            WHERE c.id = ?
            GROUP BY c.id
        `, [id]);

        console.log(`✅ Conversation updated: ${id} by ${req.user.email}`);

        res.json({
            message: 'Conversation updated successfully',
            conversation: updatedConversation[0]
        });
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ message: 'Error updating conversation' });
    }
});

// DELETE /api/messages/conversations/:id - Leave/delete conversation
router.delete('/conversations/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user is participant
        const [participation] = await db.query(
            'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [id, userId]
        );

        if (participation.length === 0) {
            return res.status(403).json({ message: 'You are not a participant in this conversation' });
        }

        // Get conversation info
        const [conversation] = await db.query(
            'SELECT type, created_by FROM conversations WHERE id = ?',
            [id]
        );

        if (conversation.length === 0) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const conv = conversation[0];

        // Remove user from conversation
        await db.query(
            'DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [id, userId]
        );

        // Check remaining participants
        const [remainingParticipants] = await db.query(
            'SELECT COUNT(*) as count FROM conversation_participants WHERE conversation_id = ?',
            [id]
        );

        // If no participants left or only 1 participant in a direct message, delete conversation
        if (remainingParticipants[0].count === 0 || (conv.type === 'direct' && remainingParticipants[0].count === 1)) {
            // Delete messages first (foreign key constraint)
            await db.query('DELETE FROM messages WHERE conversation_id = ?', [id]);
            // Delete remaining participants
            await db.query('DELETE FROM conversation_participants WHERE conversation_id = ?', [id]);
            // Delete conversation
            await db.query('DELETE FROM conversations WHERE id = ?', [id]);

            console.log(`✅ Conversation deleted: ${id} by ${req.user.email}`);
            res.json({ message: 'Conversation deleted successfully' });
        } else {
            console.log(`✅ User left conversation: ${id} by ${req.user.email}`);
            res.json({ message: 'Left conversation successfully' });
        }
    } catch (error) {
        console.error('Error leaving/deleting conversation:', error);
        res.status(500).json({ message: 'Error leaving conversation' });
    }
});

// GET /api/messages/count - Get message count for current user
router.get('/count', protect, async (req, res) => {
    try {
        const [result] = await db.query(`
            SELECT COUNT(DISTINCT m.conversation_id) as count
            FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = ?
        `, [req.user.id]);

        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching message count:', error);
        res.status(500).json({ message: 'Error fetching message count' });
    }
});

// GET /api/messages/unread - Get unread message count
router.get('/unread', protect, async (req, res) => {
    try {
        const [result] = await db.query(`
            SELECT COUNT(*) as count
            FROM messages m
            JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = ? 
            AND m.sender_id != ? 
            AND m.is_read = FALSE
        `, [req.user.id, req.user.id]);

        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ message: 'Error fetching unread count' });
    }
});

module.exports = router;