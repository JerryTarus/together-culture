const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { protect, admin } = require('../middleware/authMiddleware');
// Get current user's profile
router.get('/me', protect, async (req, res) => {
    if (!req.user) {
        return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(req.user);
});
// Get all users (admin only)
router.get('/', protect, admin, async (req, res) => {
    try {
        const [users] = await db.query(
            "SELECT id, full_name, email, role, status, created_at FROM users ORDER BY created_at DESC"
        );
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error while fetching users.' });
    }
});

// Get users by status (admin only)
router.get('/status/:status', protect, admin, async (req, res) => {
    const { status } = req.params;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status filter.' });
    }
    try {
        const [users] = await db.query(
            "SELECT id, full_name, email, role, status, created_at FROM users WHERE status = ? ORDER BY created_at DESC",
            [status]
        );
        res.json(users);
    } catch (err) {
        console.error('Error fetching users by status:', err);
        res.status(500).json({ message: 'Server error while fetching users by status.' });
    }
});

// Approve a user (admin only)
router.patch('/:id/approve', protect, admin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
    }
    try {
        const [result] = await db.query(
            "UPDATE users SET status = 'approved' WHERE id = ?",
            [userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: 'User approved successfully.' });
    } catch (err) {
        console.error('Error approving user:', err);
        res.status(500).json({ message: 'Server error while approving user.' });
    }
});

// Reject a user (admin only)
router.patch('/:id/reject', protect, admin, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
    }
    try {
        const [result] = await db.query(
            "UPDATE users SET status = 'rejected' WHERE id = ?",
            [userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: 'User rejected successfully.' });
    } catch (err) {
        console.error('Error rejecting user:', err);
        res.status(500).json({ message: 'Server error while rejecting user.' });
    }
});
// Get a specific user by ID (admin only)
router.get('/:id', protect, admin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }
        const [rows] = await db.query(
            'SELECT id, full_name, email, role, bio, skills FROM users WHERE id = ?', [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching user by ID:', err);
        res.status(500).json({ message: 'Server error while fetching user.' });
    }
});
// Update a user's profile (admin only)
router.put('/:id', protect, admin, async (req, res) => {
    const { full_name, email, role, bio, skills } = req.body;
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
    }
    if (!full_name || !email || !role) {
        return res.status(400).json({ message: 'Full name, email, and role are required.' });
    }
    try {
        await db.query(
            'UPDATE users SET full_name = ?, email = ?, role = ?, bio = ?, skills = ? WHERE id = ?',
            [full_name, email, role, bio || '', skills || '', userId]
        );
        res.json({ message: 'User updated successfully.' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Server error while updating user.' });
    }
});
// Delete a user (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You cannot delete your own account." });
        }
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error while deleting user.' });
    }
});

// Update current user's own profile
router.put('/me/profile', protect, async (req, res) => {
    const { full_name, email, bio, skills } = req.body;
    const userId = req.user.id;
    
    if (!full_name || !email) {
        return res.status(400).json({ message: 'Full name and email are required.' });
    }
    
    try {
        // Check if email is already taken by another user
        const [existingUser] = await db.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, userId]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email is already taken by another user.' });
        }
        
        await db.query(
            'UPDATE users SET full_name = ?, email = ?, bio = ?, skills = ? WHERE id = ?',
            [full_name, email, bio || '', skills || '', userId]
        );
        
        res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Server error while updating profile.' });
    }
});

// Change current user's password
router.post('/change-password', protect, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }
    
    try {
        // Get current user's password hash
        const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }
        
        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password in database
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);
        
        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Server error while changing password.' });
    }
});

// Get current user's activity
router.get('/me/activity', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get recent visits
        const [visits] = await db.query(
            `SELECT v.visit_date, e.title as event_title, 'attended_event' as type, v.visit_date as created_at
             FROM visits v 
             JOIN events e ON v.event_id = e.id 
             WHERE v.user_id = ? 
             ORDER BY v.visit_date DESC 
             LIMIT 5`,
            [userId]
        );
        
        // Get recent messages
        const [messages] = await db.query(
            `SELECT m.sent_at as created_at, 'sent_message' as type, 'Sent a message' as description
             FROM messages m 
             JOIN conversations c ON m.conversation_id = c.id 
             WHERE m.sender_id = ? 
             ORDER BY m.sent_at DESC 
             LIMIT 5`,
            [userId]
        );
        
        // Combine and sort activities
        const activities = [...visits, ...messages].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 10);
        
        // Format activities
        const formattedActivities = activities.map(activity => {
            if (activity.type === 'attended_event') {
                return {
                    description: `Attended ${activity.event_title}`,
                    created_at: activity.created_at,
                    type: activity.type
                };
            } else {
                return {
                    description: activity.description,
                    created_at: activity.created_at,
                    type: activity.type
                };
            }
        });
        
        res.json(formattedActivities);
    } catch (err) {
        console.error('Error fetching user activity:', err);
        res.status(500).json({ message: 'Server error while fetching user activity.' });
    }
});

module.exports = router;