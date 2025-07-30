// backend/routes/users.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: user-id-timestamp.ext
        const ext = path.extname(file.originalname);
        cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
    }
});

const avatarFilter = (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
};

const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: avatarFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only 1 file
    }
});

// GET /api/users - Get all users (admin only)
router.get('/', protect, admin, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT 
                id, full_name, email, role, status, bio, skills, 
                avatar_url, created_at, last_login, updated_at
            FROM users 
            ORDER BY created_at DESC
        `);
        
        // Remove any sensitive information (though password is not selected)
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });
        
        res.json(safeUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// GET /api/users - Get all users (for messaging)
router.get('/', protect, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, full_name, email, role FROM users WHERE id != ? ORDER BY full_name ASC',
            [req.user.id]
        );
        
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// GET /api/users/me - Get current user profile
router.get('/me', protect, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT 
                id, full_name, email, role, status, bio, skills, 
                avatar_url, created_at, last_login, updated_at,
                email_notifications, push_notifications, privacy_level
            FROM users 
            WHERE id = ?
        `, [req.user.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = users[0];
        
        // Remove sensitive information
        delete user.password;
        
        res.json({ user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching user profile' });
    }
});

// PUT /api/users/me/profile - Update user profile
router.put('/me/profile', protect, async (req, res) => {
    try {
        const { full_name, bio, skills } = req.body;
        
        // Validation
        if (!full_name || full_name.trim().length < 2) {
            return res.status(400).json({ 
                message: 'Invalid input data',
                errors: { full_name: 'Full name must be at least 2 characters long' }
            });
        }
        
        if (bio && bio.length > 1000) {
            return res.status(400).json({ 
                message: 'Invalid input data',
                errors: { bio: 'Bio must be less than 1000 characters' }
            });
        }
        
        if (skills && skills.length > 500) {
            return res.status(400).json({ 
                message: 'Invalid input data',
                errors: { skills: 'Skills must be less than 500 characters' }
            });
        }
        
        // Update profile
        await db.query(`
            UPDATE users 
            SET full_name = ?, bio = ?, skills = ?, updated_at = NOW()
            WHERE id = ?
        `, [full_name.trim(), bio?.trim() || null, skills?.trim() || null, req.user.id]);
        
        // Get updated user data
        const [updatedUser] = await db.query(`
            SELECT 
                id, full_name, email, role, status, bio, skills, 
                avatar_url, created_at, last_login, updated_at
            FROM users 
            WHERE id = ?
        `, [req.user.id]);
        
        console.log(`✅ Profile updated for user: ${req.user.email}`);
        
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// PUT /api/users/me/password - Change password
router.put('/me/password', protect, async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;
        
        // Validation
        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({ 
                message: 'All password fields are required',
                errors: {
                    current_password: !current_password ? 'Current password is required' : null,
                    new_password: !new_password ? 'New password is required' : null,
                    confirm_password: !confirm_password ? 'Password confirmation is required' : null
                }
            });
        }
        
        if (new_password !== confirm_password) {
            return res.status(400).json({ 
                message: 'Password confirmation does not match',
                errors: { confirm_password: 'Passwords do not match' }
            });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ 
                message: 'New password is too weak',
                errors: { new_password: 'Password must be at least 6 characters long' }
            });
        }
        
        // Get current user with password
        const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = users[0];
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ 
                message: 'Current password is incorrect',
                errors: { current_password: 'Current password is incorrect' }
            });
        }
        
        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);
        
        // Update password
        await db.query(`
            UPDATE users 
            SET password = ?, updated_at = NOW()
            WHERE id = ?
        `, [hashedNewPassword, req.user.id]);
        
        console.log(`✅ Password changed for user: ${req.user.email}`);
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
});

// POST /api/users/me/avatar - Upload avatar
router.post('/me/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                message: 'No avatar file uploaded',
                errors: { avatar: 'Avatar file is required' }
            });
        }
        
        // Get current avatar to delete old file
        const [users] = await db.query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
        const currentAvatarUrl = users[0]?.avatar_url;
        
        // Generate avatar URL
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        // Update user avatar in database
        await db.query(`
            UPDATE users 
            SET avatar_url = ?, updated_at = NOW()
            WHERE id = ?
        `, [avatarUrl, req.user.id]);
        
        // Delete old avatar file if exists
        if (currentAvatarUrl && currentAvatarUrl !== avatarUrl) {
            const oldAvatarPath = path.join(__dirname, '..', currentAvatarUrl);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }
        
        console.log(`✅ Avatar uploaded for user: ${req.user.email}`);
        
        res.json({
            message: 'Avatar uploaded successfully',
            avatar_url: avatarUrl
        });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    message: 'File too large. Maximum size is 5MB.',
                    errors: { avatar: 'File size limit exceeded' }
                });
            }
        }
        
        res.status(500).json({ message: 'Error uploading avatar' });
    }
});

// DELETE /api/users/me/avatar - Remove avatar
router.delete('/me/avatar', protect, async (req, res) => {
    try {
        // Get current avatar
        const [users] = await db.query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
        const currentAvatarUrl = users[0]?.avatar_url;
        
        if (!currentAvatarUrl) {
            return res.status(400).json({ message: 'No avatar to remove' });
        }
        
        // Remove avatar from database
        await db.query(`
            UPDATE users 
            SET avatar_url = NULL, updated_at = NOW()
            WHERE id = ?
        `, [req.user.id]);
        
        // Delete avatar file
        const avatarPath = path.join(__dirname, '..', currentAvatarUrl);
        if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
        }
        
        console.log(`✅ Avatar removed for user: ${req.user.email}`);
        
        res.json({ message: 'Avatar removed successfully' });
    } catch (error) {
        console.error('Error removing avatar:', error);
        res.status(500).json({ message: 'Error removing avatar' });
    }
});

// PUT /api/users/me/preferences - Update user preferences
router.put('/me/preferences', protect, async (req, res) => {
    try {
        const { 
            email_notifications = true, 
            push_notifications = true, 
            privacy_level = 'public' 
        } = req.body;
        
        // Validate privacy level
        const validPrivacyLevels = ['public', 'members', 'private'];
        if (!validPrivacyLevels.includes(privacy_level)) {
            return res.status(400).json({ 
                message: 'Invalid privacy level',
                errors: { privacy_level: 'Privacy level must be public, members, or private' }
            });
        }
        
        // Update preferences
        await db.query(`
            UPDATE users 
            SET email_notifications = ?, push_notifications = ?, privacy_level = ?, updated_at = NOW()
            WHERE id = ?
        `, [email_notifications, push_notifications, privacy_level, req.user.id]);
        
        console.log(`✅ Preferences updated for user: ${req.user.email}`);
        
        res.json({ 
            message: 'Preferences updated successfully',
            preferences: {
                email_notifications,
                push_notifications,
                privacy_level
            }
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ message: 'Error updating preferences' });
    }
});

// GET /api/users/me/activity - Get user activity
router.get('/me/activity', protect, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        // Get user's recent activities
        const activities = [];
        
        // Recent event attendances
        const [recentAttendances] = await db.query(`
            SELECT 
                'event_attendance' as type,
                v.created_at as activity_date,
                e.title as event_title,
                e.id as event_id
            FROM visits v
            JOIN events e ON v.event_id = e.id
            WHERE v.user_id = ?
            ORDER BY v.created_at DESC
            LIMIT ?
        `, [req.user.id, parseInt(limit)]);
        
        // Recent resource uploads
        const [recentUploads] = await db.query(`
            SELECT 
                'resource_upload' as type,
                r.created_at as activity_date,
                r.title as resource_title,
                r.id as resource_id
            FROM resources r
            WHERE r.uploaded_by = ?
            ORDER BY r.created_at DESC
            LIMIT ?
        `, [req.user.id, parseInt(limit)]);
        
        // Recent messages sent
        const [recentMessages] = await db.query(`
            SELECT 
                'message_sent' as type,
                m.created_at as activity_date,
                c.name as conversation_name,
                m.id as message_id
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.sender_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?
        `, [req.user.id, parseInt(limit)]);
        
        // Combine all activities
        activities.push(
            ...recentAttendances.map(activity => ({
                ...activity,
                description: `Attended event: ${activity.event_title}`
            })),
            ...recentUploads.map(activity => ({
                ...activity,
                description: `Uploaded resource: ${activity.resource_title}`
            })),
            ...recentMessages.map(activity => ({
                ...activity,
                description: `Sent message in: ${activity.conversation_name || 'conversation'}`
            }))
        );
        
        // Sort by activity date and limit
        activities.sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date));
        const limitedActivities = activities.slice(0, parseInt(limit));
        
        res.json({ activities: limitedActivities });
    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({ message: 'Error fetching user activity' });
    }
});

// DELETE /api/users/me/account - Delete user account
router.delete('/me/account', protect, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ 
                message: 'Password is required to delete account',
                errors: { password: 'Password is required' }
            });
        }
        
        // Get user with password
        const [users] = await db.query('SELECT password, email, avatar_url FROM users WHERE id = ?', [req.user.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = users[0];
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ 
                message: 'Incorrect password',
                errors: { password: 'Password is incorrect' }
            });
        }
        
        // Delete related data
        await db.query('DELETE FROM visits WHERE user_id = ?', [req.user.id]);
        await db.query('DELETE FROM conversation_participants WHERE user_id = ?', [req.user.id]);
        await db.query('UPDATE resources SET uploaded_by = NULL WHERE uploaded_by = ?', [req.user.id]);
        await db.query('UPDATE events SET created_by = NULL WHERE created_by = ?', [req.user.id]);
        await db.query('UPDATE messages SET sender_id = NULL WHERE sender_id = ?', [req.user.id]);
        
        // Delete avatar file if exists
        if (user.avatar_url) {
            const avatarPath = path.join(__dirname, '..', user.avatar_url);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        }
        
        // Delete user account
        await db.query('DELETE FROM users WHERE id = ?', [req.user.id]);
        
        console.log(`✅ Account deleted for user: ${user.email}`);
        
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Error deleting account' });
    }
});

// GET /api/users/search - Search users (for messaging, etc.)
router.get('/search', protect, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.json({ users: [] });
        }
        
        const searchTerm = `%${q.trim()}%`;
        
        const [users] = await db.query(`
            SELECT 
                id, full_name, email, avatar_url, bio
            FROM users 
            WHERE (full_name LIKE ? OR email LIKE ?) 
                AND id != ? 
                AND role = 'member' 
                AND status = 'approved'
            ORDER BY full_name ASC
            LIMIT ?
        `, [searchTerm, searchTerm, req.user.id, parseInt(limit)]);
        
        res.json({ users });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Error searching users' });
    }
});

// GET /api/users/status/:status - Get users by status (admin only)
router.get('/status/:status', protect, admin, async (req, res) => {
    try {
        const { status } = req.params;
        const validStatuses = ['pending', 'approved', 'rejected'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const [users] = await db.query(`
            SELECT 
                id, full_name, email, role, status, bio, skills, 
                avatar_url, created_at, last_login, updated_at
            FROM users 
            WHERE status = ?
            ORDER BY created_at DESC
        `, [status]);
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users by status:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// PATCH /api/users/:id/approve - Approve user (admin only)
router.patch('/:id/approve', protect, admin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user exists and is pending
        const [users] = await db.query('SELECT id, status, email FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = users[0];
        if (user.status !== 'pending') {
            return res.status(400).json({ message: 'User is not pending approval' });
        }
        
        // Approve user
        await db.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', ['approved', userId]);
        
        console.log(`✅ User approved by admin: ${req.user.email} - User: ${user.email}`);
        
        res.json({ message: 'User approved successfully' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ message: 'Error approving user' });
    }
});

// PATCH /api/users/:id/reject - Reject user (admin only)
router.patch('/:id/reject', protect, admin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user exists and is pending
        const [users] = await db.query('SELECT id, status, email FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = users[0];
        if (user.status !== 'pending') {
            return res.status(400).json({ message: 'User is not pending approval' });
        }
        
        // Reject user
        await db.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', ['rejected', userId]);
        
        console.log(`✅ User rejected by admin: ${req.user.email} - User: ${user.email}`);
        
        res.json({ message: 'User rejected successfully' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ message: 'Error rejecting user' });
    }
});

// GET /api/users/:id - Get specific user (admin only)
router.get('/:id', protect, admin, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT 
                id, full_name, email, role, status, bio, skills, 
                avatar_url, created_at, last_login, updated_at
            FROM users 
            WHERE id = ?
        `, [req.params.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user' });
    }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const { full_name, email, role, bio, skills } = req.body;
        const userId = req.params.id;
        
        // Validation
        if (!full_name || full_name.trim().length < 2) {
            return res.status(400).json({ 
                message: 'Invalid input data',
                errors: { full_name: 'Full name must be at least 2 characters long' }
            });
        }
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ 
                message: 'Invalid input data',
                errors: { email: 'Valid email is required' }
            });
        }
        
        if (role && !['admin', 'member'].includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid input data',
                errors: { role: 'Role must be admin or member' }
            });
        }
        
        // Check if user exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
        if (existingUsers.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if email is already taken by another user
        const [emailCheck] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
        if (emailCheck.length > 0) {
            return res.status(400).json({ 
                message: 'Email already taken',
                errors: { email: 'This email is already in use' }
            });
        }
        
        // Update user
        await db.query(`
            UPDATE users 
            SET full_name = ?, email = ?, role = ?, bio = ?, skills = ?, updated_at = NOW()
            WHERE id = ?
        `, [full_name.trim(), email.trim(), role || 'member', bio?.trim() || null, skills?.trim() || null, userId]);
        
        // Get updated user data
        const [updatedUser] = await db.query(`
            SELECT 
                id, full_name, email, role, status, bio, skills, 
                avatar_url, created_at, last_login, updated_at
            FROM users 
            WHERE id = ?
        `, [userId]);
        
        console.log(`✅ User updated by admin: ${req.user.email} - User ID: ${userId}`);
        
        res.json({
            message: 'User updated successfully',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
});

// PATCH /api/users/:id/approve - Approve user (admin only)
router.patch('/:id/approve', protect, admin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user exists and is pending
        const [users] = await db.query('SELECT id, status, email FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = users[0];
        if (user.status !== 'pending') {
            return res.status(400).json({ message: 'User is not pending approval' });
        }
        
        // Approve user
        await db.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', ['approved', userId]);
        
        console.log(`✅ User approved by admin: ${req.user.email} - User: ${user.email}`);
        
        res.json({ message: 'User approved successfully' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ message: 'Error approving user' });
    }
});

// PATCH /api/users/:id/reject - Reject user (admin only)
router.patch('/:id/reject', protect, admin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user exists and is pending
        const [users] = await db.query('SELECT id, status, email FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = users[0];
        if (user.status !== 'pending') {
            return res.status(400).json({ message: 'User is not pending approval' });
        }
        
        // Reject user
        await db.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', ['rejected', userId]);
        
        console.log(`✅ User rejected by admin: ${req.user.email} - User: ${user.email}`);
        
        res.json({ message: 'User rejected successfully' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ message: 'Error rejecting user' });
    }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Prevent admin from deleting themselves
        if (userId == req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        
        // Check if user exists
        const [users] = await db.query('SELECT id, email, avatar_url FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = users[0];
        
        // Delete related data
        await db.query('DELETE FROM visits WHERE user_id = ?', [userId]);
        await db.query('DELETE FROM conversation_participants WHERE user_id = ?', [userId]);
        await db.query('UPDATE resources SET uploaded_by = NULL WHERE uploaded_by = ?', [userId]);
        await db.query('UPDATE events SET created_by = NULL WHERE created_by = ?', [userId]);
        await db.query('UPDATE messages SET sender_id = NULL WHERE sender_id = ?', [userId]);
        
        // Delete avatar file if exists
        if (user.avatar_url) {
            const avatarPath = path.join(__dirname, '..', user.avatar_url);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        }
        
        // Delete user
        await db.query('DELETE FROM users WHERE id = ?', [userId]);
        
        console.log(`✅ User deleted by admin: ${req.user.email} - Deleted user: ${user.email}`);
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// GET /api/users/me/activity - Get current user's recent activity
router.get('/me/activity', protect, async (req, res) => {
    try {
        const activities = [];
        
        // Get recent events attended
        const [events] = await db.query(`
            SELECT 
                'event' as type,
                CONCAT('Attended event: ', e.title) as description,
                v.attended_at as created_at
            FROM visits v
            JOIN events e ON v.event_id = e.id
            WHERE v.user_id = ?
            ORDER BY v.attended_at DESC
            LIMIT 5
        `, [req.user.id]);
        
        // Get recent messages sent
        const [messages] = await db.query(`
            SELECT 
                'message' as type,
                'Sent a message in conversation' as description,
                m.created_at
            FROM messages m
            WHERE m.sender_id = ?
            ORDER BY m.created_at DESC
            LIMIT 5
        `, [req.user.id]);
        
        // Get recent resource downloads (if tracking exists)
        const [resources] = await db.query(`
            SELECT 
                'resource' as type,
                CONCAT('Downloaded resource: ', r.filename) as description,
                r.created_at
            FROM resources r
            WHERE r.uploaded_by = ?
            ORDER BY r.created_at DESC
            LIMIT 3
        `, [req.user.id]);
        
        // Combine and sort activities
        const allActivities = [...events, ...messages, ...resources]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);
        
        res.json(allActivities);
    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({ message: 'Error fetching user activity' });
    }
});

module.exports = router;