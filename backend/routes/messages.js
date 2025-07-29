
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/messages/conversations - Get all conversations for the current user
router.get('/conversations', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get conversations with latest message info
        const [conversations] = await db.query(`
            SELECT 
                c.id,
                c.name,
                c.type,
                c.created_at,
                c.updated_at,
                
                -- Get latest message
                latest_msg.content as latest_message,
                latest_msg.created_at as latest_message_time,
                latest_sender.full_name as latest_sender_name,
                latest_sender.id as latest_sender_id,
                
                -- Count unread messages
                COALESCE(unread_count.count, 0) as unread_count,
                
                -- Get participant info for direct messages
                CASE 
                    WHEN c.type = 'direct' THEN other_user.full_name
                    ELSE NULL
                END as other_participant_name,
                CASE 
                    WHEN c.type = 'direct' THEN other_user.id
                    ELSE NULL
                END as other_participant_id
                
            FROM conversations c
            
            -- Join to get user participation
            INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
            
            -- Get latest message
            LEFT JOIN (
                SELECT 
                    m1.conversation_id,
                    m1.content,
                    m1.created_at,
                    m1.sender_id
                FROM messages m1
                INNER JOIN (
                    SELECT conversation_id, MAX(created_at) as max_time
                    FROM messages
                    GROUP BY conversation_id
                ) m2 ON m1.conversation_id = m2.conversation_id AND m1.created_at = m2.max_time
            ) latest_msg ON c.id = latest_msg.conversation_id
            
            -- Get sender info for latest message
            LEFT JOIN users latest_sender ON latest_msg.sender_id = latest_sender.id
            
            -- Count unread messages
            LEFT JOIN (
                SELECT 
                    conversation_id,
                    COUNT(*) as count
                FROM messages
                WHERE is_read = FALSE 
                AND sender_id != ?
                GROUP BY conversation_id
            ) unread_count ON c.id = unread_count.conversation_id
            
            -- For direct messages, get the other participant
            LEFT JOIN conversation_participants cp_other ON c.id = cp_other.conversation_id 
                AND cp_other.user_id != ? 
                AND c.type = 'direct'
            LEFT JOIN users other_user ON cp_other.user_id = other_user.id
            
            WHERE cp.user_id = ?
            ORDER BY COALESCE(latest_msg.created_at, c.created_at) DESC
        `, [userId, userId, userId]);
        
        res.json({ conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Error fetching conversations' });
    }
});

// GET /api/messages/conversations/:id - Get messages in a conversation
router.get('/conversations/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        const userId = req.user.id;
        
        // Check if user is participant in this conversation
        const [participation] = await db.query(
            'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (participation.length === 0) {
            return res.status(403).json({ message: 'You are not a participant in this conversation' });
        }
        
        // Get conversation details
        const [conversations] = await db.query(`
            SELECT 
                c.*,
                GROUP_CONCAT(DISTINCT u.full_name ORDER BY u.full_name) as participants
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            JOIN users u ON cp.user_id = u.id
            WHERE c.id = ?
            GROUP BY c.id
        `, [id]);
        
        if (conversations.length === 0) {
            return res.status(404).json({ message: 'Conversation not found' });
        }
        
        // Get messages with pagination
        const [messages] = await db.query(`
            SELECT 
                m.id,
                m.content,
                m.created_at,
                m.sender_id,
                u.full_name as sender_name,
                m.is_read,
                m.message_type
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [id, parseInt(limit), offset]);
        
        // Mark messages as read (except user's own messages)
        await db.query(
            'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
            [id, userId]
        );
        
        // Get total message count for pagination
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
            [id]
        );
        
        res.json({
            conversation: conversations[0],
            messages: messages.reverse(), // Reverse to show oldest first
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching conversation messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// POST /api/messages/conversations - Create a new conversation
router.post('/conversations', protect, async (req, res) => {
    try {
        const { name, type = 'group', participant_ids = [] } = req.body;
        const userId = req.user.id;
        
        // Validation
        if (type === 'group' && !name) {
            return res.status(400).json({ 
                message: 'Group conversations require a name',
                errors: { name: 'Name is required for group conversations' }
            });
        }
        
        if (type === 'direct' && participant_ids.length !== 1) {
            return res.status(400).json({ 
                message: 'Direct conversations require exactly one other participant',
                errors: { participant_ids: 'Must specify exactly one other participant' }
            });
        }
        
        // For direct messages, check if conversation already exists
        if (type === 'direct') {
            const otherUserId = participant_ids[0];
            const [existing] = await db.query(`
                SELECT c.id 
                FROM conversations c
                JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
                JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
                WHERE c.type = 'direct'
                AND cp1.user_id = ?
                AND cp2.user_id = ?
                AND (
                    SELECT COUNT(*) 
                    FROM conversation_participants 
                    WHERE conversation_id = c.id
                ) = 2
            `, [userId, otherUserId]);
            
            if (existing.length > 0) {
                return res.status(400).json({ 
                    message: 'Direct conversation already exists',
                    conversation_id: existing[0].id
                });
            }
        }
        
        // Validate participants exist
        if (participant_ids.length > 0) {
            const [users] = await db.query(
                `SELECT id FROM users WHERE id IN (${participant_ids.map(() => '?').join(',')}) AND status = 'approved'`,
                participant_ids
            );
            
            if (users.length !== participant_ids.length) {
                return res.status(400).json({ 
                    message: 'Some participants not found or not approved',
                    errors: { participant_ids: 'Invalid or unapproved participants' }
                });
            }
        }
        
        // Create conversation
        const conversationName = type === 'direct' ? null : name;
        const [result] = await db.query(
            'INSERT INTO conversations (name, type, created_by, created_at) VALUES (?, ?, ?, NOW())',
            [conversationName, type, userId]
        );
        
        const conversationId = result.insertId;
        
        // Add participants (including creator)
        const allParticipants = [userId, ...participant_ids];
        const participantValues = allParticipants.map(id => [conversationId, id]);
        
        await db.query(
            'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ?',
            [participantValues]
        );
        
        // Get the created conversation with participant info
        const [newConversation] = await db.query(`
            SELECT 
                c.*,
                GROUP_CONCAT(u.full_name ORDER BY u.full_name) as participants
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            JOIN users u ON cp.user_id = u.id
            WHERE c.id = ?
            GROUP BY c.id
        `, [conversationId]);
        
        console.log(`✅ Conversation created: ${type} conversation by ${req.user.email}`);
        
        res.status(201).json({
            message: 'Conversation created successfully',
            conversation: newConversation[0]
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ message: 'Error creating conversation' });
    }
});

// POST /api/messages/conversations/:id/messages - Send a message
router.post('/conversations/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, message_type = 'text' } = req.body;
        const userId = req.user.id;
        
        // Validation
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ 
                message: 'Message content is required',
                errors: { content: 'Content cannot be empty' }
            });
        }
        
        if (content.length > 1000) {
            return res.status(400).json({ 
                message: 'Message too long',
                errors: { content: 'Message must be 1000 characters or less' }
            });
        }
        
        // Check if user is participant in this conversation
        const [participation] = await db.query(
            'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (participation.length === 0) {
            return res.status(403).json({ message: 'You are not a participant in this conversation' });
        }
        
        // Send message
        const [result] = await db.query(
            'INSERT INTO messages (conversation_id, sender_id, content, message_type, created_at) VALUES (?, ?, ?, ?, NOW())',
            [id, userId, content.trim(), message_type]
        );
        
        // Update conversation timestamp
        await db.query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
            [id]
        );
        
        // Get the sent message with sender info
        const [message] = await db.query(`
            SELECT 
                m.id,
                m.content,
                m.created_at,
                m.sender_id,
                u.full_name as sender_name,
                m.is_read,
                m.message_type
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);
        
        console.log(`✅ Message sent in conversation ${id} by ${req.user.email}`);
        
        res.status(201).json({
            message: 'Message sent successfully',
            data: message[0]
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