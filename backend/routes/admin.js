const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// Get admin dashboard statistics
router.get('/stats', protect, admin, async (req, res) => {
    try {
        const [totalUsers] = await db.query(
            "SELECT COUNT(id) as count FROM users WHERE role = 'member'"
        );
        const [totalEvents] = await db.query(
            "SELECT COUNT(id) as count FROM events"
        );
        const [totalVisits] = await db.query(
            "SELECT COUNT(id) as count FROM visits"
        );
        res.json({
            totalMembers: totalUsers[0].count,
            totalEvents: totalEvents[0].count,
            totalVisits: totalVisits[0].count
        });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ message: 'Server error while fetching admin statistics.' });
    }
});

// Get recent activity for admin dashboard
router.get('/recent-activity', protect, admin, async (req, res) => {
    try {
        // Get recent user registrations
        const [recentUsers] = await db.query(
            "SELECT full_name, created_at, 'user_registered' as type FROM users WHERE role = 'member' ORDER BY created_at DESC LIMIT 5"
        );
        
        // Get recent event visits
        const [recentVisits] = await db.query(
            `SELECT v.visit_date as created_at, e.title as event_title, u.full_name as user_name, 'event_attended' as type 
             FROM visits v 
             JOIN events e ON v.event_id = e.id 
             JOIN users u ON v.user_id = u.id 
             ORDER BY v.visit_date DESC 
             LIMIT 5`
        );
        
        // Get recent messages
        const [recentMessages] = await db.query(
            `SELECT m.sent_at as created_at, u.full_name as user_name, 'message_sent' as type 
             FROM messages m 
             JOIN users u ON m.sender_id = u.id 
             ORDER BY m.sent_at DESC 
             LIMIT 5`
        );
        
        // Combine and sort all activities
        const allActivities = [
            ...recentUsers.map(user => ({
                description: `${user.full_name} registered`,
                created_at: user.created_at,
                type: user.type
            })),
            ...recentVisits.map(visit => ({
                description: `${visit.user_name} attended ${visit.event_title}`,
                created_at: visit.created_at,
                type: visit.type
            })),
            ...recentMessages.map(message => ({
                description: `${message.user_name} sent a message`,
                created_at: message.created_at,
                type: message.type
            }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
         .slice(0, 10);
        
        res.json(allActivities);
    } catch (err) {
        console.error('Error fetching recent activity:', err);
        res.status(500).json({ message: 'Server error while fetching recent activity.' });
    }
});

module.exports = router;