// backend/routes/events.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/events - Get all events (with filtering and pagination)
router.get('/', protect, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status = 'all', 
            search = '',
            sortBy = 'date',
            sortOrder = 'ASC'
        } = req.query;

        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        let queryParams = [];

        // Filter by status
        if (status !== 'all') {
            if (status === 'upcoming') {
                whereClause += ' AND date >= CURDATE()';
            } else if (status === 'past') {
                whereClause += ' AND date < CURDATE()';
            }
        }

        // Search functionality
        if (search) {
            whereClause += ' AND (title LIKE ? OR description LIKE ? OR location LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        // Sort order validation
        const validSortColumns = ['date', 'title', 'capacity', 'created_at'];
        const validSortOrders = ['ASC', 'DESC'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'date';
        const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        // Get total count for pagination
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM events WHERE ${whereClause}`,
            queryParams
        );
        const totalEvents = countResult[0].total;

        // Get events with registration count and user registration status
        const [events] = await db.query(
            `SELECT 
                e.*,
                COUNT(v.id) as registered_count,
                (CASE WHEN COUNT(v.id) >= e.capacity THEN true ELSE false END) as is_full,
                (CASE WHEN uv.id IS NOT NULL THEN true ELSE false END) as is_user_registered
            FROM events e
            LEFT JOIN visits v ON e.id = v.event_id
            LEFT JOIN visits uv ON e.id = uv.event_id AND uv.user_id = ?
            WHERE ${whereClause}
            GROUP BY e.id
            ORDER BY e.${sortColumn} ${sortDirection}
            LIMIT ? OFFSET ?`,
            [req.user.id, ...queryParams, parseInt(limit), offset]
        );

        res.json({
            events,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalEvents,
                totalPages: Math.ceil(totalEvents / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Error fetching events' });
    }
});

// GET /api/events/:id - Get single event with details
router.get('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;

        // Get event details
        const [events] = await db.query(
            `SELECT 
                e.*,
                COUNT(v.id) as registered_count,
                (CASE WHEN COUNT(v.id) >= e.capacity THEN true ELSE false END) as is_full
            FROM events e
            LEFT JOIN visits v ON e.id = v.event_id
            WHERE e.id = ?
            GROUP BY e.id`,
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const event = events[0];

        // Get registered users for this event
        const [registrations] = await db.query(
            `SELECT 
                v.id as visit_id,
                v.created_at as registered_at,
                u.id as user_id,
                u.full_name,
                u.email
            FROM visits v
            JOIN users u ON v.user_id = u.id
            WHERE v.event_id = ?
            ORDER BY v.created_at ASC`,
            [id]
        );

        // Check if current user is registered
        const [userRegistration] = await db.query(
            'SELECT id FROM visits WHERE event_id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({
            ...event,
            registrations,
            is_user_registered: userRegistration.length > 0,
            user_registration_id: userRegistration.length > 0 ? userRegistration[0].id : null
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ message: 'Error fetching event details' });
    }
});

// POST /api/events - Create new event (admin only)
router.post('/', protect, admin, async (req, res) => {
    try {
        const { title, description, date, time, location, capacity } = req.body;

        // Validation
        if (!title || !description || !date || !time || !location || !capacity) {
            return res.status(400).json({ 
                message: 'All fields are required',
                errors: {
                    title: !title ? 'Title is required' : null,
                    description: !description ? 'Description is required' : null,
                    date: !date ? 'Date is required' : null,
                    time: !time ? 'Time is required' : null,
                    location: !location ? 'Location is required' : null,
                    capacity: !capacity ? 'Capacity is required' : null
                }
            });
        }

        // Validate capacity is a positive number
        if (!Number.isInteger(parseInt(capacity)) || parseInt(capacity) <= 0) {
            return res.status(400).json({ 
                message: 'Capacity must be a positive number',
                errors: { capacity: 'Must be a positive number' }
            });
        }

        // Validate date is not in the past
        const eventDate = new Date(`${date} ${time}`);
        if (eventDate < new Date()) {
            return res.status(400).json({ 
                message: 'Event date cannot be in the past',
                errors: { date: 'Cannot be in the past' }
            });
        }

        const [result] = await db.query(
            `INSERT INTO events (title, description, date, time, location, capacity, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description, date, time, location, parseInt(capacity), req.user.id]
        );

        // Get the created event
        const [newEvent] = await db.query('SELECT * FROM events WHERE id = ?', [result.insertId]);

        console.log(`✅ Event created: ${title} by ${req.user.email}`);

        res.status(201).json({
            message: 'Event created successfully',
            event: newEvent[0]
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Error creating event' });
    }
});

// PUT /api/events/:id - Update event (admin only)
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, date, time, location, capacity } = req.body;

        // Check if event exists
        const [existingEvents] = await db.query('SELECT * FROM events WHERE id = ?', [id]);
        if (existingEvents.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Validation
        if (!title || !description || !date || !time || !location || !capacity) {
            return res.status(400).json({ 
                message: 'All fields are required',
                errors: {
                    title: !title ? 'Title is required' : null,
                    description: !description ? 'Description is required' : null,
                    date: !date ? 'Date is required' : null,
                    time: !time ? 'Time is required' : null,
                    location: !location ? 'Location is required' : null,
                    capacity: !capacity ? 'Capacity is required' : null
                }
            });
        }

        // Validate capacity
        if (!Number.isInteger(parseInt(capacity)) || parseInt(capacity) <= 0) {
            return res.status(400).json({ 
                message: 'Capacity must be a positive number',
                errors: { capacity: 'Must be a positive number' }
            });
        }

        // Check if reducing capacity below current registrations
        const [registrationCount] = await db.query(
            'SELECT COUNT(*) as count FROM visits WHERE event_id = ?',
            [id]
        );

        if (parseInt(capacity) < registrationCount[0].count) {
            return res.status(400).json({ 
                message: `Cannot reduce capacity below current registrations (${registrationCount[0].count})`,
                errors: { capacity: `Must be at least ${registrationCount[0].count}` }
            });
        }

        await db.query(
            `UPDATE events 
             SET title = ?, description = ?, date = ?, time = ?, location = ?, capacity = ?, updated_at = NOW()
             WHERE id = ?`,
            [title, description, date, time, location, parseInt(capacity), id]
        );

        // Get the updated event
        const [updatedEvent] = await db.query('SELECT * FROM events WHERE id = ?', [id]);

        console.log(`✅ Event updated: ${title} by ${req.user.email}`);

        res.json({
            message: 'Event updated successfully',
            event: updatedEvent[0]
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Error updating event' });
    }
});

// DELETE /api/events/:id - Delete event (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if event exists
        const [existingEvents] = await db.query('SELECT title FROM events WHERE id = ?', [id]);
        if (existingEvents.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const eventTitle = existingEvents[0].title;

        // Delete associated visits first (foreign key constraint)
        await db.query('DELETE FROM visits WHERE event_id = ?', [id]);

        // Delete the event
        await db.query('DELETE FROM events WHERE id = ?', [id]);

        console.log(`✅ Event deleted: ${eventTitle} by ${req.user.email}`);

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Error deleting event' });
    }
});

// POST /api/events/:id/register - Register for event
router.post('/:id/register', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if event exists
        const [events] = await db.query(
            `SELECT 
                e.*,
                COUNT(v.id) as registered_count
            FROM events e
            LEFT JOIN visits v ON e.id = v.event_id
            WHERE e.id = ?
            GROUP BY e.id`,
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const event = events[0];

        // Check if event is in the future
        const eventDateTime = new Date(`${event.date} ${event.time}`);
        if (eventDateTime < new Date()) {
            return res.status(400).json({ 
                message: 'Cannot register for past events',
                errors: { event: 'Event has already occurred' }
            });
        }

        // Check if already registered
        const [existingRegistration] = await db.query(
            'SELECT id FROM visits WHERE event_id = ? AND user_id = ?',
            [id, userId]
        );

        if (existingRegistration.length > 0) {
            return res.status(400).json({ 
                message: 'You are already registered for this event',
                errors: { registration: 'Already registered' }
            });
        }

        // Check capacity
        if (event.registered_count >= event.capacity) {
            return res.status(400).json({ 
                message: 'Event is at full capacity',
                errors: { capacity: 'Event is full' }
            });
        }

        // Register user for event
        const [result] = await db.query(
            'INSERT INTO visits (user_id, event_id, created_at) VALUES (?, ?, NOW())',
            [userId, id]
        );

        console.log(`✅ User registered for event: ${req.user.email} -> ${event.title}`);

        res.status(201).json({
            message: 'Successfully registered for event',
            registration_id: result.insertId
        });
    } catch (error) {
        console.error('Error registering for event:', error);
        res.status(500).json({ message: 'Error registering for event' });
    }
});

// DELETE /api/events/:id/register - Unregister from event
router.delete('/:id/register', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if registration exists
        const [existingRegistration] = await db.query(
            'SELECT id FROM visits WHERE event_id = ? AND user_id = ?',
            [id, userId]
        );

        if (existingRegistration.length === 0) {
            return res.status(404).json({ 
                message: 'You are not registered for this event',
                errors: { registration: 'Not registered' }
            });
        }

        // Get event details for logging
        const [events] = await db.query('SELECT title FROM events WHERE id = ?', [id]);
        const eventTitle = events.length > 0 ? events[0].title : 'Unknown Event';

        // Unregister user
        await db.query('DELETE FROM visits WHERE event_id = ? AND user_id = ?', [id, userId]);

        console.log(`✅ User unregistered from event: ${req.user.email} -> ${eventTitle}`);

        res.json({ message: 'Successfully unregistered from event' });
    } catch (error) {
        console.error('Error unregistering from event:', error);
        res.status(500).json({ message: 'Error unregistering from event' });
    }
});

// GET /api/events/upcoming - Get upcoming events (optimized)
router.get('/upcoming', protect, async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const [events] = await db.query(
            `SELECT 
                e.*,
                COUNT(v.id) as registered_count,
                (CASE WHEN COUNT(v.id) >= e.capacity THEN true ELSE false END) as is_full,
                (CASE WHEN uv.id IS NOT NULL THEN true ELSE false END) as is_user_registered
            FROM events e
            LEFT JOIN visits v ON e.id = v.event_id
            LEFT JOIN visits uv ON e.id = uv.event_id AND uv.user_id = ?
            WHERE e.date >= CURDATE()
            GROUP BY e.id
            ORDER BY e.date ASC, e.time ASC
            LIMIT ?`,
            [req.user.id, parseInt(limit)]
        );

        res.json({ events });
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({ message: 'Error fetching upcoming events' });
    }
});

// GET /api/events/attended - Get count of events attended by user
router.get('/attended', protect, async (req, res) => {
    try {
        const [result] = await db.query(
            `SELECT COUNT(DISTINCT v.event_id) as count
             FROM visits v
             JOIN events e ON v.event_id = e.id
             WHERE v.user_id = ? AND e.date < CURDATE()`,
            [req.user.id]
        );

        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching attended events count:', error);
        res.status(500).json({ message: 'Error fetching attended events count' });
    }
});

// GET /api/events/attendance-stats - Get average attendance stats
router.get('/attendance-stats', protect, admin, async (req, res) => {
    try {
        const [result] = await db.query(
            `SELECT 
                AVG(attendance_count) as average_attendance,
                COUNT(e.id) as total_events,
                SUM(attendance_count) as total_attendance
            FROM (
                SELECT 
                    e.id,
                    COUNT(v.id) as attendance_count
                FROM events e
                LEFT JOIN visits v ON e.id = v.event_id
                WHERE e.date < CURDATE()
                GROUP BY e.id
            ) as e`
        );

        const stats = result[0];

        res.json({
            average_attendance: Math.round(stats.average_attendance || 0),
            total_events: stats.total_events || 0,
            total_attendance: stats.total_attendance || 0
        });
    } catch (error) {
        console.error('Error fetching attendance stats:', error);
        res.status(500).json({ message: 'Error fetching attendance stats' });
    }
});

// GET /api/events/attended - Get events attended by current user
router.get('/attended', protect, async (req, res) => {
    try {
        const [events] = await db.query(`
            SELECT 
                e.*,
                v.attended_at
            FROM events e
            JOIN visits v ON e.id = v.event_id
            WHERE v.user_id = ?
            ORDER BY v.attended_at DESC
        `, [req.user.id]);

        res.json({ count: events.length, events });
    } catch (error) {
        console.error('Error fetching attended events:', error);
        res.status(500).json({ message: 'Error fetching attended events' });
    }
});



module.exports = router;