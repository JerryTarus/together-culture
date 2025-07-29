const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// @route   POST /api/events
// @desc    Create a new event
// @access  Private/Admin
// Create a new event (admin only)
router.post('/', protect, admin, async (req, res) => {
    const { title, description, event_date, location, capacity } = req.body;
    if (!title || !description || !event_date || !location) {
        return res.status(400).json({ message: 'Please provide all event details.' });
    }
    const eventCapacity = Number.isInteger(capacity) ? capacity : (parseInt(capacity, 10) || 0);
    try {
        const [result] = await db.query(
            'INSERT INTO events (title, description, event_date, location, capacity) VALUES (?, ?, ?, ?, ?)',
            [title, description, event_date, location, eventCapacity]
        );
        res.status(201).json({ message: 'Event created successfully', eventId: result.insertId });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ message: 'Server error while creating event.' });
    }
});

// @route   GET /api/events
// @desc    Get all events
// @access  Private
// Get all events (all members)
router.get('/', protect, async (req, res) => {
    try {
        const [events] = await db.query("SELECT *, (SELECT COUNT(*) FROM visits WHERE event_id = events.id) AS registrations FROM events ORDER BY event_date ASC");
        res.json(events);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ message: 'Server error while fetching events.' });
    }
});

// Get upcoming events
router.get('/upcoming', protect, async (req, res) => {
    try {
        const [events] = await db.query(
            "SELECT id, title, description, event_date, location, capacity FROM events WHERE event_date >= CURDATE() ORDER BY event_date ASC LIMIT 10"
        );
        res.json(events);
    } catch (err) {
        console.error('Error fetching upcoming events:', err);
        res.status(500).json({ message: 'Server error while fetching upcoming events.' });
    }
});

// Get attended events count for current user
router.get('/attended', protect, async (req, res) => {
    try {
        const [result] = await db.query(
            "SELECT COUNT(DISTINCT event_id) as count FROM visits WHERE user_id = ?",
            [req.user.id]
        );
        res.json({ count: result[0].count });
    } catch (err) {
        console.error('Error fetching attended events count:', err);
        res.status(500).json({ message: 'Server error while fetching attended events count.' });
    }
});

// Get attendance statistics
router.get('/attendance-stats', protect, async (req, res) => {
    try {
        const [result] = await db.query(
            "SELECT AVG(attendance_count) as average FROM (SELECT event_id, COUNT(*) as attendance_count FROM visits GROUP BY event_id) as event_attendance"
        );
        res.json({ average: result[0].average || 0 });
    } catch (err) {
        console.error('Error fetching attendance stats:', err);
        res.status(500).json({ message: 'Server error while fetching attendance statistics.' });
    }
});

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private/Admin
// Update an event (admin only)
router.put('/:id', protect, admin, async (req, res) => {
    const { title, description, event_date, location, capacity } = req.body;
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID.' });
    }
    if (!title || !description || !event_date || !location) {
        return res.status(400).json({ message: 'Please provide all event details.' });
    }
    const eventCapacity = Number.isInteger(capacity) ? capacity : (parseInt(capacity, 10) || 0);
    try {
        await db.query(
            'UPDATE events SET title = ?, description = ?, event_date = ?, location = ?, capacity = ? WHERE id = ?',
            [title, description, event_date, location, eventCapacity, eventId]
        );
        res.json({ message: 'Event updated successfully.' });
    } catch (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ message: 'Server error while updating event.' });
    }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private/Admin
// Delete an event (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID.' });
    }
    try {
        await db.query('DELETE FROM events WHERE id = ?', [eventId]);
        res.json({ message: 'Event deleted successfully.' });
    } catch (err) {
        console.error('Error deleting event:', err);
        res.status(500).json({ message: 'Server error while deleting event.' });
    }
});

// @route   POST /api/events/:id/visits
// @desc    Record a member's visit to an event
// @access  Private/Admin
router.post('/:id/visits', protect, admin, async (req, res) => {
    const { user_id, visit_date } = req.body;
    const eventId = parseInt(req.params.id, 10);
    
    if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID.' });
    }
    
    if (!user_id) {
        return res.status(400).json({ message: 'Please provide user ID.' });
    }
    
    try {
        // Check if event exists
        const [events] = await db.query('SELECT id FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // Check if user exists
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [user_id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Check if visit already exists
        const [existingVisit] = await db.query(
            'SELECT id FROM visits WHERE user_id = ? AND event_id = ?',
            [user_id, eventId]
        );
        
        if (existingVisit.length > 0) {
            return res.status(400).json({ message: 'Visit already recorded for this user and event.' });
        }
        // --- Capacity enforcement ---
        const [[eventCapRow]] = await db.query('SELECT capacity FROM events WHERE id = ?', [eventId]);
        const [[regRow]] = await db.query('SELECT COUNT(*) AS registrations FROM visits WHERE event_id = ?', [eventId]);
        if (eventCapRow.capacity > 0 && regRow.registrations >= eventCapRow.capacity) {
            return res.status(400).json({ message: 'Event is full. Registration is closed.' });
        }
        
        const visitDate = visit_date || new Date().toISOString().split('T')[0];
        
        const [result] = await db.query(
            'INSERT INTO visits (user_id, event_id, visit_date) VALUES (?, ?, ?)',
            [user_id, eventId, visitDate]
        );
        
        res.status(201).json({ 
            message: 'Visit recorded successfully', 
            visitId: result.insertId 
        });
    } catch (err) {
        console.error('Error recording visit:', err);
        res.status(500).json({ message: 'Server error while recording visit.' });
    }
});

// @route   GET /api/events/:id/visits
// @desc    Get all visits for an event
// @access  Private/Admin
router.get('/:id/visits', protect, admin, async (req, res) => {
    const eventId = parseInt(req.params.id, 10);
    
    if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID.' });
    }
    
    try {
        const [visits] = await db.query(`
            SELECT v.id, v.visit_date, u.id as user_id, u.full_name, u.email
            FROM visits v
            JOIN users u ON v.user_id = u.id
            WHERE v.event_id = ?
            ORDER BY v.visit_date DESC
        `, [eventId]);
        
        res.json(visits);
    } catch (err) {
        console.error('Error fetching visits:', err);
        res.status(500).json({ message: 'Server error while fetching visits.' });
    }
});

// @route   GET /api/events/visits/user/:userId
// @desc    Get all visits for a specific user (member activity)
// @access  Private/Admin
router.get('/visits/user/:userId', protect, admin, async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
    }
    
    try {
        const [visits] = await db.query(`
            SELECT v.id, v.visit_date, e.id as event_id, e.title as event_title, 
                   e.description as event_description, e.event_date, e.location
            FROM visits v
            JOIN events e ON v.event_id = e.id
            WHERE v.user_id = ?
            ORDER BY v.visit_date DESC
        `, [userId]);
        
        res.json(visits);
    } catch (err) {
        console.error('Error fetching user visits:', err);
        res.status(500).json({ message: 'Server error while fetching user visits.' });
    }
});

// @route   DELETE /api/events/:id/visits/:visitId
// @desc    Delete a visit record
// @access  Private/Admin
router.delete('/:id/visits/:visitId', protect, admin, async (req, res) => {
    const eventId = parseInt(req.params.id, 10);
    const visitId = parseInt(req.params.visitId, 10);
    
    if (isNaN(eventId) || isNaN(visitId)) {
        return res.status(400).json({ message: 'Invalid event or visit ID.' });
    }
    
    try {
        await db.query('DELETE FROM visits WHERE id = ? AND event_id = ?', [visitId, eventId]);
        res.json({ message: 'Visit deleted successfully.' });
    } catch (err) {
        console.error('Error deleting visit:', err);
        res.status(500).json({ message: 'Server error while deleting visit.' });
    }
});

module.exports = router;