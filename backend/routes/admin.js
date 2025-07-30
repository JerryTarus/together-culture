// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get recent activity
router.get('/recent-activity', async (req, res) => {
    try {
        const [activities] = await db.query(`
            SELECT 
                'User Registration' as type,
                CONCAT(full_name, ' registered for an account') as description,
                created_at
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            
            UNION ALL
            
            SELECT 
                'Event Created' as type,
                CONCAT('Event "', title, '" was created') as description,
                created_at
            FROM events 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            
            UNION ALL
            
            SELECT 
                'Message Sent' as type,
                CONCAT('New message sent in system') as description,
                sent_at as created_at
            FROM messages 
            WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        res.json(activities);
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ message: 'Failed to load recent activity' });
    }
});

module.exports = router;
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', protect, admin, async (req, res) => {
    try {
        // Get basic counts
        const [memberCount] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'member'");
        const [eventCount] = await db.query("SELECT COUNT(*) as count FROM events");
        const [visitCount] = await db.query("SELECT COUNT(*) as count FROM visits");
        const [resourceCount] = await db.query("SELECT COUNT(*) as count FROM resources");

        // Get pending members count
        const [pendingCount] = await db.query("SELECT COUNT(*) as count FROM users WHERE status = 'pending'");

        res.json({
            total_members: memberCount[0].count,
            total_events: eventCount[0].count,
            total_visits: visitCount[0].count,
            total_resources: resourceCount[0].count,
            pending_members: pendingCount[0].count
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
});

// GET /api/admin/members - Get all members with filtering and pagination
router.get('/members', protect, admin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status = 'all', 
            search = '',
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let whereClause = "role = 'member'";
        let queryParams = [];
        
        // Filter by status
        if (status !== 'all') {
            whereClause += ' AND status = ?';
            queryParams.push(status);
        }
        
        // Search functionality
        if (search) {
            whereClause += ' AND (full_name LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm);
        }
        
        // Sort validation
        const validSortColumns = ['created_at', 'full_name', 'email', 'last_login', 'status'];
        const validSortOrders = ['ASC', 'DESC'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        // Get total count for pagination
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
            queryParams
        );
        const totalMembers = countResult[0].total;
        
        // Get members with additional stats
        const [members] = await db.query(`
            SELECT 
                u.*,
                COUNT(DISTINCT v.id) as events_attended,
                COUNT(DISTINCT r.id) as resources_uploaded
            FROM users u
            LEFT JOIN visits v ON u.id = v.user_id
            LEFT JOIN resources r ON u.id = r.uploaded_by
            WHERE ${whereClause}
            GROUP BY u.id
            ORDER BY u.${sortColumn} ${sortDirection}
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), offset]);
        
        res.json({
            members,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalMembers,
                totalPages: Math.ceil(totalMembers / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ message: 'Error fetching members' });
    }
});

// PUT /api/admin/members/:id/status - Update member status
router.put('/members/:id/status', protect, admin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason = '' } = req.body;
        
        // Validate status
        const validStatuses = ['pending', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status',
                errors: { status: 'Status must be pending, approved, or rejected' }
            });
        }
        
        // Check if member exists
        const [members] = await db.query(
            "SELECT id, full_name, email, status FROM users WHERE id = ? AND role = 'member'",
            [id]
        );
        
        if (members.length === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        const member = members[0];
        
        // Update member status
        await db.query(
            'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );
        
        // Log the status change
        console.log(`✅ Member status updated: ${member.email} -> ${status} by ${req.user.email}`);
        
        // Get updated member info
        const [updatedMember] = await db.query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        
        res.json({
            message: `Member status updated to ${status}`,
            member: updatedMember[0]
        });
    } catch (error) {
        console.error('Error updating member status:', error);
        res.status(500).json({ message: 'Error updating member status' });
    }
});

// GET /api/admin/members/:id - Get detailed member information
router.get('/members/:id', protect, admin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get member details
        const [members] = await db.query(
            "SELECT * FROM users WHERE id = ? AND role = 'member'",
            [id]
        );
        
        if (members.length === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        const member = members[0];
        
        // Get member's events attended
        const [eventsAttended] = await db.query(`
            SELECT 
                e.id, e.title, e.date, e.location,
                v.created_at as attended_date
            FROM visits v
            JOIN events e ON v.event_id = e.id
            WHERE v.user_id = ?
            ORDER BY e.date DESC
            LIMIT 10
        `, [id]);
        
        // Get member's uploaded resources
        const [resourcesUploaded] = await db.query(`
            SELECT 
                id, title, category, file_name, file_size, downloads, created_at
            FROM resources
            WHERE uploaded_by = ?
            ORDER BY created_at DESC
            LIMIT 10
        `, [id]);
        
        // Get member's messages count
        const [messageCount] = await db.query(`
            SELECT COUNT(*) as count
            FROM messages
            WHERE sender_id = ?
        `, [id]);
        
        res.json({
            member,
            events_attended: eventsAttended,
            resources_uploaded: resourcesUploaded,
            messages_sent: messageCount[0].count,
            activity_summary: {
                events_count: eventsAttended.length,
                resources_count: resourcesUploaded.length,
                messages_count: messageCount[0].count
            }
        });
    } catch (error) {
        console.error('Error fetching member details:', error);
        res.status(500).json({ message: 'Error fetching member details' });
    }
});

// GET /api/admin/pending-members - Get pending members for approval
router.get('/pending-members', protect, admin, async (req, res) => {
    try {
        const [pendingMembers] = await db.query(`
            SELECT 
                id, full_name, email, bio, skills, created_at
            FROM users 
            WHERE role = 'member' AND status = 'pending'
            ORDER BY created_at ASC
        `);
        
        res.json({ pending_members: pendingMembers });
    } catch (error) {
        console.error('Error fetching pending members:', error);
        res.status(500).json({ message: 'Error fetching pending members' });
    }
});

// POST /api/admin/members/:id/approve - Approve a member
router.post('/members/:id/approve', protect, admin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if member exists and is pending
        const [members] = await db.query(
            "SELECT id, full_name, email, status FROM users WHERE id = ? AND role = 'member'",
            [id]
        );
        
        if (members.length === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        const member = members[0];
        
        if (member.status === 'approved') {
            return res.status(400).json({ message: 'Member is already approved' });
        }
        
        // Approve member
        await db.query(
            'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
            ['approved', id]
        );
        
        console.log(`✅ Member approved: ${member.email} by ${req.user.email}`);
        
        res.json({
            message: 'Member approved successfully',
            member: { ...member, status: 'approved' }
        });
    } catch (error) {
        console.error('Error approving member:', error);
        res.status(500).json({ message: 'Error approving member' });
    }
});

// POST /api/admin/members/:id/reject - Reject a member
router.post('/members/:id/reject', protect, admin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = '' } = req.body;
        
        // Check if member exists
        const [members] = await db.query(
            "SELECT id, full_name, email, status FROM users WHERE id = ? AND role = 'member'",
            [id]
        );
        
        if (members.length === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        const member = members[0];
        
        // Reject member
        await db.query(
            'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
            ['rejected', id]
        );
        
        console.log(`✅ Member rejected: ${member.email} by ${req.user.email}${reason ? ` (Reason: ${reason})` : ''}`);
        
        res.json({
            message: 'Member rejected',
            member: { ...member, status: 'rejected' }
        });
    } catch (error) {
        console.error('Error rejecting member:', error);
        res.status(500).json({ message: 'Error rejecting member' });
    }
});

// GET /api/admin/analytics - Get detailed analytics
router.get('/analytics', protect, admin, async (req, res) => {
    try {
        // Member statistics
        const [memberStats] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM users 
            WHERE role = 'member'
            GROUP BY status
        `);
        
        // Event statistics
        const [eventStats] = await db.query(`
            SELECT 
                COUNT(*) as total_events,
                SUM(CASE WHEN date >= CURDATE() THEN 1 ELSE 0 END) as upcoming_events,
                SUM(CASE WHEN date < CURDATE() THEN 1 ELSE 0 END) as past_events
            FROM events
        `);
        
        // Visit statistics
        const [visitStats] = await db.query(`
            SELECT 
                COUNT(*) as total_visits,
                COUNT(DISTINCT user_id) as unique_attendees,
                COUNT(DISTINCT event_id) as events_with_visits
            FROM visits
        `);
        
        // Monthly registration trends
        const [registrationTrends] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as registrations
            FROM users 
            WHERE role = 'member' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `);
        
        // Event attendance trends
        const [attendanceTrends] = await db.query(`
            SELECT 
                DATE_FORMAT(e.date, '%Y-%m') as month,
                COUNT(v.id) as total_attendance,
                COUNT(DISTINCT v.user_id) as unique_attendees
            FROM events e
            LEFT JOIN visits v ON e.id = v.event_id
            WHERE e.date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(e.date, '%Y-%m')
            ORDER BY month ASC
        `);
        
        // Top active members
        const [activeMembers] = await db.query(`
            SELECT 
                u.id, u.full_name, u.email,
                COUNT(DISTINCT v.event_id) as events_attended,
                COUNT(DISTINCT r.id) as resources_uploaded,
                COUNT(DISTINCT m.id) as messages_sent
            FROM users u
            LEFT JOIN visits v ON u.id = v.user_id
            LEFT JOIN resources r ON u.id = r.uploaded_by
            LEFT JOIN messages m ON u.id = m.sender_id
            WHERE u.role = 'member' AND u.status = 'approved'
            GROUP BY u.id
            ORDER BY (events_attended + resources_uploaded + messages_sent) DESC
            LIMIT 10
        `);
        
        res.json({
            member_stats: memberStats,
            event_stats: eventStats[0],
            visit_stats: visitStats[0],
            registration_trends: registrationTrends,
            attendance_trends: attendanceTrends,
            active_members: activeMembers
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
});

// GET /api/admin/recent-activity - Get recent admin activity
router.get('/recent-activity', protect, admin, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        // Get recent user registrations
        const [recentRegistrations] = await db.query(`
            SELECT 
                'registration' as type,
                id, full_name, email, created_at as activity_date,
                status
            FROM users 
            WHERE role = 'member'
            ORDER BY created_at DESC
            LIMIT ?
        `, [parseInt(limit)]);
        
        // Get recent event attendances
        const [recentAttendances] = await db.query(`
            SELECT 
                'attendance' as type,
                v.created_at as activity_date,
                u.full_name, u.email,
                e.title as event_title
            FROM visits v
            JOIN users u ON v.user_id = u.id
            JOIN events e ON v.event_id = e.id
            ORDER BY v.created_at DESC
            LIMIT ?
        `, [parseInt(limit)]);
        
        // Get recent resource uploads
        const [recentUploads] = await db.query(`
            SELECT 
                'upload' as type,
                r.created_at as activity_date,
                u.full_name, u.email,
                r.title as resource_title
            FROM resources r
            JOIN users u ON r.uploaded_by = u.id
            ORDER BY r.created_at DESC
            LIMIT ?
        `, [parseInt(limit)]);
        
        // Combine and sort all activities
        const allActivities = [
            ...recentRegistrations.map(activity => ({
                ...activity,
                description: `${activity.full_name} registered`
            })),
            ...recentAttendances.map(activity => ({
                ...activity,
                description: `${activity.full_name} attended ${activity.event_title}`
            })),
            ...recentUploads.map(activity => ({
                ...activity,
                description: `${activity.full_name} uploaded ${activity.resource_title}`
            }))
        ];
        
        // Sort by activity date and limit
        allActivities.sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date));
        const limitedActivities = allActivities.slice(0, parseInt(limit));
        
        res.json({ recent_activity: limitedActivities });
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ message: 'Error fetching recent activity' });
    }
});

// POST /api/admin/bulk-approve - Bulk approve members
router.post('/bulk-approve', protect, admin, async (req, res) => {
    try {
        const { member_ids } = req.body;
        
        if (!Array.isArray(member_ids) || member_ids.length === 0) {
            return res.status(400).json({ 
                message: 'Invalid member IDs',
                errors: { member_ids: 'Must provide array of member IDs' }
            });
        }
        
        // Validate all member IDs exist and are pending
        const placeholders = member_ids.map(() => '?').join(',');
        const [members] = await db.query(
            `SELECT id, full_name, email, status FROM users 
             WHERE id IN (${placeholders}) AND role = 'member'`,
            member_ids
        );
        
        if (members.length !== member_ids.length) {
            return res.status(400).json({ message: 'Some member IDs are invalid' });
        }
        
        // Approve all members
        await db.query(
            `UPDATE users SET status = 'approved', updated_at = NOW() 
             WHERE id IN (${placeholders})`,
            member_ids
        );
        
        console.log(`✅ Bulk approved ${member_ids.length} members by ${req.user.email}`);
        
        res.json({
            message: `Successfully approved ${member_ids.length} members`,
            approved_count: member_ids.length,
            members: members
        });
    } catch (error) {
        console.error('Error bulk approving members:', error);
        res.status(500).json({ message: 'Error bulk approving members' });
    }
});

// DELETE /api/admin/members/:id - Delete member (admin only)
router.delete('/members/:id', protect, admin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if member exists
        const [members] = await db.query(
            "SELECT id, full_name, email FROM users WHERE id = ? AND role = 'member'",
            [id]
        );
        
        if (members.length === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }
        
        const member = members[0];
        
        // Delete related data first (to maintain referential integrity)
        await db.query('DELETE FROM visits WHERE user_id = ?', [id]);
        await db.query('DELETE FROM conversation_participants WHERE user_id = ?', [id]);
        await db.query('UPDATE resources SET uploaded_by = NULL WHERE uploaded_by = ?', [id]);
        await db.query('UPDATE events SET created_by = NULL WHERE created_by = ?', [id]);
        
        // Delete the member
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        
        console.log(`✅ Member deleted: ${member.email} by ${req.user.email}`);
        
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ message: 'Error deleting member' });
    }
});

// GET /api/admin/engagement-scores - Get member engagement scores
router.get('/engagement-scores', protect, admin, async (req, res) => {
    try {
        const { limit = 20, sortBy = 'engagement_score', sortOrder = 'DESC' } = req.query;
        
        // Calculate engagement scores for all approved members
        const [memberEngagement] = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.avatar_url,
                u.created_at,
                u.last_login,
                
                -- Event engagement (40% weight)
                COUNT(DISTINCT v.event_id) as events_attended,
                COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) as recent_events,
                
                -- Resource engagement (30% weight)
                COUNT(DISTINCT r.id) as resources_uploaded,
                COALESCE(SUM(r.downloads), 0) as total_downloads,
                COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) as recent_uploads,
                
                -- Communication engagement (20% weight)
                COUNT(DISTINCT m.id) as messages_sent,
                COUNT(DISTINCT m.conversation_id) as conversations_participated,
                COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) as recent_messages,
                
                -- Profile completeness (10% weight)
                CASE 
                    WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 
                END +
                CASE 
                    WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 
                END +
                CASE 
                    WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 
                END as profile_score,
                
                -- Calculate weighted engagement score (0-100)
                LEAST(100, ROUND(
                    -- Event engagement (40%)
                    (COUNT(DISTINCT v.event_id) * 8 + COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) * 12) * 0.4 +
                    
                    -- Resource engagement (30%)
                    (COUNT(DISTINCT r.id) * 10 + COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) * 15 + LEAST(20, COALESCE(SUM(r.downloads), 0) / 5)) * 0.3 +
                    
                    -- Communication engagement (20%)
                    (LEAST(20, COUNT(DISTINCT m.id) / 5) + LEAST(10, COUNT(DISTINCT m.conversation_id)) + COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) * 2) * 0.2 +
                    
                    -- Profile completeness (10%)
                    ((CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 END +
                      CASE WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 END +
                      CASE WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 END) / 60 * 100) * 0.1,
                    2
                )) as engagement_score,
                
                -- Engagement level categorization
                CASE 
                    WHEN LEAST(100, ROUND(
                        (COUNT(DISTINCT v.event_id) * 8 + COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) * 12) * 0.4 +
                        (COUNT(DISTINCT r.id) * 10 + COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) * 15 + LEAST(20, COALESCE(SUM(r.downloads), 0) / 5)) * 0.3 +
                        (LEAST(20, COUNT(DISTINCT m.id) / 5) + LEAST(10, COUNT(DISTINCT m.conversation_id)) + COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) * 2) * 0.2 +
                        ((CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 END +
                          CASE WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 END +
                          CASE WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 END) / 60 * 100) * 0.1,
                        2
                    )) >= 80 THEN 'Highly Engaged'
                    WHEN LEAST(100, ROUND(
                        (COUNT(DISTINCT v.event_id) * 8 + COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) * 12) * 0.4 +
                        (COUNT(DISTINCT r.id) * 10 + COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) * 15 + LEAST(20, COALESCE(SUM(r.downloads), 0) / 5)) * 0.3 +
                        (LEAST(20, COUNT(DISTINCT m.id) / 5) + LEAST(10, COUNT(DISTINCT m.conversation_id)) + COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) * 2) * 0.2 +
                        ((CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 END +
                          CASE WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 END +
                          CASE WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 END) / 60 * 100) * 0.1,
                        2
                    )) >= 60 THEN 'Moderately Engaged'
                    WHEN LEAST(100, ROUND(
                        (COUNT(DISTINCT v.event_id) * 8 + COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) * 12) * 0.4 +
                        (COUNT(DISTINCT r.id) * 10 + COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) * 15 + LEAST(20, COALESCE(SUM(r.downloads), 0) / 5)) * 0.3 +
                        (LEAST(20, COUNT(DISTINCT m.id) / 5) + LEAST(10, COUNT(DISTINCT m.conversation_id)) + COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) * 2) * 0.2 +
                        ((CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 END +
                          CASE WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 END +
                          CASE WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 END) / 60 * 100) * 0.1,
                        2
                    )) >= 30 THEN 'Lightly Engaged'
                    ELSE 'Inactive'
                END as engagement_level
                
            FROM users u
            LEFT JOIN visits v ON u.id = v.user_id
            LEFT JOIN events e ON v.event_id = e.id
            LEFT JOIN resources r ON u.id = r.uploaded_by
            LEFT JOIN messages m ON u.id = m.sender_id
            WHERE u.role = 'member' AND u.status = 'approved'
            GROUP BY u.id, u.full_name, u.email, u.avatar_url, u.created_at, u.last_login, u.bio, u.skills
            ORDER BY engagement_score DESC, u.full_name ASC
            LIMIT ?
        `, [parseInt(limit)]);
        
        // Get engagement statistics
        const [engagementStats] = await db.query(`
            SELECT 
                AVG(engagement_score) as avg_engagement,
                MAX(engagement_score) as max_engagement,
                MIN(engagement_score) as min_engagement,
                COUNT(*) as total_members,
                SUM(CASE WHEN engagement_level = 'Highly Engaged' THEN 1 ELSE 0 END) as highly_engaged,
                SUM(CASE WHEN engagement_level = 'Moderately Engaged' THEN 1 ELSE 0 END) as moderately_engaged,
                SUM(CASE WHEN engagement_level = 'Lightly Engaged' THEN 1 ELSE 0 END) as lightly_engaged,
                SUM(CASE WHEN engagement_level = 'Inactive' THEN 1 ELSE 0 END) as inactive
            FROM (
                SELECT 
                    LEAST(100, ROUND(
                        (COUNT(DISTINCT v.event_id) * 8 + COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) * 12) * 0.4 +
                        (COUNT(DISTINCT r.id) * 10 + COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) * 15 + LEAST(20, COALESCE(SUM(r.downloads), 0) / 5)) * 0.3 +
                        (LEAST(20, COUNT(DISTINCT m.id) / 5) + LEAST(10, COUNT(DISTINCT m.conversation_id)) + COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) * 2) * 0.2 +
                        ((CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 END +
                          CASE WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 END +
                          CASE WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 END) / 60 * 100) * 0.1,
                        2
                    )) as engagement_score,
                    CASE 
                        WHEN LEAST(100, ROUND(
                            (COUNT(DISTINCT v.event_id) * 8 + COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) * 12) * 0.4 +
                            (COUNT(DISTINCT r.id) * 10 + COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) * 15 + LEAST(20, COALESCE(SUM(r.downloads), 0) / 5)) * 0.3 +
                            (LEAST(20, COUNT(DISTINCT m.id) / 5) + LEAST(10, COUNT(DISTINCT m.conversation_id)) + COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) * 2) * 0.2 +
                            ((CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 END +
                              CASE WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 END +
                              CASE WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 END) / 60 * 100) * 0.1,
                            2
                        )) >= 80 THEN 'Highly Engaged'
                        WHEN LEAST(100, ROUND(
                            (COUNT(DISTINCT v.event_id) * 8 + COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) * 12) * 0.4 +
                            (COUNT(DISTINCT r.id) * 10 + COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) * 15 + LEAST(20, COALESCE(SUM(r.downloads), 0) / 5)) * 0.3 +
                            (LEAST(20, COUNT(DISTINCT m.id) / 5) + LEAST(10, COUNT(DISTINCT m.conversation_id)) + COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) * 2) * 0.2 +
                            ((CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 END +
                              CASE WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 END +
                              CASE WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 END) / 60 * 100) * 0.1,
                            2
                        )) >= 60 THEN 'Moderately Engaged'
                        WHEN LEAST(100, ROUND(
                            (COUNT(DISTINCT v.event_id) * 8 + COUNT(DISTINCT CASE WHEN e.date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.event_id END) * 12) * 0.4 +
                            (COUNT(DISTINCT r.id) * 10 + COUNT(DISTINCT CASE WHEN r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN r.id END) * 15 + LEAST(20, COALESCE(SUM(r.downloads), 0) / 5)) * 0.3 +
                            (LEAST(20, COUNT(DISTINCT m.id) / 5) + LEAST(10, COUNT(DISTINCT m.conversation_id)) + COUNT(DISTINCT CASE WHEN m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN m.id END) * 2) * 0.2 +
                            ((CASE WHEN u.bio IS NOT NULL AND LENGTH(u.bio) > 0 THEN 20 ELSE 0 END +
                              CASE WHEN u.skills IS NOT NULL AND LENGTH(u.skills) > 0 THEN 20 ELSE 0 END +
                              CASE WHEN u.avatar_url IS NOT NULL THEN 20 ELSE 0 END) / 60 * 100) * 0.1,
                            2
                        )) >= 30 THEN 'Lightly Engaged'
                        ELSE 'Inactive'
                    END as engagement_level
                FROM users u
                LEFT JOIN visits v ON u.id = v.user_id
                LEFT JOIN events e ON v.event_id = e.id
                LEFT JOIN resources r ON u.id = r.uploaded_by
                LEFT JOIN messages m ON u.id = m.sender_id
                WHERE u.role = 'member' AND u.status = 'approved'
                GROUP BY u.id
            ) AS engagement_data
        `);
        
        res.json({
            engagement_scores: memberEngagement,
            statistics: engagementStats[0]
        });
    } catch (error) {
        console.error('Error fetching engagement scores:', error);
        res.status(500).json({ message: 'Error fetching engagement scores' });
    }
});

module.exports = router;