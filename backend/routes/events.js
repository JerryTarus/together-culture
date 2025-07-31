
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const db = require('../config/db');

// Get all events with pagination and filtering
router.get('/', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const sortBy = req.query.sortBy || 'date';
        const sortOrder = req.query.sortOrder || 'DESC';
        const offset = (page - 1) * limit;

        // Build WHERE conditions
        let whereConditions = [];
        let queryParams = [];

        if (search) {
            whereConditions.push('(e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status === 'upcoming') {
            whereConditions.push('DATE(e.date) >= CURDATE()');
        } else if (status === 'past') {
            whereConditions.push('DATE(e.date) < CURDATE()');
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Count total events
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM events e 
            ${whereClause}
        `;
        const [countResult] = await db.execute(countQuery, queryParams);
        const total = countResult[0].total;

        // Get events with registration info
        const eventsQuery = `
            SELECT 
                e.*,
                COUNT(DISTINCT er.user_id) as registered_count,
                CASE WHEN uer.user_id IS NOT NULL THEN 1 ELSE 0 END as is_user_registered
            FROM events e
            LEFT JOIN event_rsvps er ON e.id = er.event_id
            LEFT JOIN event_rsvps uer ON e.id = uer.event_id AND uer.user_id = ?
            ${whereClause}
            GROUP BY e.id
            ORDER BY e.${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const [events] = await db.execute(eventsQuery, [req.user.id, ...queryParams, limit, offset]);

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);

        res.json({
            events: events,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                totalPages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get upcoming events (simplified for dashboard)
router.get('/upcoming', protect, async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*,
                COUNT(DISTINCT er.user_id) as registered_count,
                CASE WHEN uer.user_id IS NOT NULL THEN 1 ELSE 0 END as is_user_registered
            FROM events e
            LEFT JOIN event_rsvps er ON e.id = er.event_id
            LEFT JOIN event_rsvps uer ON e.id = uer.event_id AND uer.user_id = ?
            WHERE DATE(e.date) >= CURDATE()
            GROUP BY e.id
            ORDER BY e.date ASC, e.time ASC
            LIMIT 5
        `;

        const [events] = await db.execute(query, [req.user.id]);
        res.json(events);
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single event with attendees
router.get('/:id', protect, async (req, res) => {
    try {
        const eventQuery = `
            SELECT 
                e.*,
                COUNT(DISTINCT er.user_id) as registered_count,
                CASE WHEN uer.user_id IS NOT NULL THEN 1 ELSE 0 END as is_user_registered
            FROM events e
            LEFT JOIN event_rsvps er ON e.id = er.event_id
            LEFT JOIN event_rsvps uer ON e.id = uer.event_id AND uer.user_id = ?
            WHERE e.id = ?
            GROUP BY e.id
        `;

        const [events] = await db.execute(eventQuery, [req.user.id, req.params.id]);

        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const event = events[0];

        // Get registrations if user is admin or registered
        if (req.user.role === 'admin' || event.is_user_registered) {
            const registrationsQuery = `
                SELECT u.id, u.full_name, u.email, er.created_at as registered_at
                FROM event_rsvps er
                JOIN users u ON er.user_id = u.id
                WHERE er.event_id = ?
                ORDER BY er.created_at ASC
            `;
            const [registrations] = await db.execute(registrationsQuery, [req.params.id]);
            event.registrations = registrations;
        }

        res.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create event (admin only)
router.post('/', protect, admin, async (req, res) => {
    try {
        const { title, description, date, time, location, capacity } = req.body;

        if (!title || !description || !date || !time || !location) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const query = `
            INSERT INTO events (title, description, date, time, location, capacity, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            title, description, date, time, location, capacity || 50, req.user.id
        ]);

        res.status(201).json({
            message: 'Event created successfully',
            event: {
                id: result.insertId,
                title,
                description,
                date,
                time,
                location,
                capacity: capacity || 50
            }
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update event (admin only)
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const { title, description, date, time, location, capacity } = req.body;

        const query = `
            UPDATE events 
            SET title = ?, description = ?, date = ?, time = ?, location = ?, capacity = ?
            WHERE id = ?
        `;

        const [result] = await db.execute(query, [
            title, description, date, time, location, capacity || 50, req.params.id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete event (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        // First delete RSVPs
        await db.execute('DELETE FROM event_rsvps WHERE event_id = ?', [req.params.id]);

        // Then delete event
        const [result] = await db.execute('DELETE FROM events WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Register for event
router.post('/:id/register', protect, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        // Check if event exists and get capacity
        const [events] = await db.execute('SELECT * FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const event = events[0];

        // Check if user already registered
        const [existingRsvp] = await db.execute(
            'SELECT * FROM event_rsvps WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        if (existingRsvp.length > 0) {
            return res.status(400).json({ message: 'You are already registered for this event' });
        }

        // Check capacity
        if (event.capacity > 0) {
            const [rsvpCount] = await db.execute(
                'SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = ?',
                [eventId]
            );

            if (rsvpCount[0].count >= event.capacity) {
                return res.status(400).json({ message: 'Event is at full capacity' });
            }
        }

        // Create registration
        await db.execute(
            'INSERT INTO event_rsvps (event_id, user_id) VALUES (?, ?)',
            [eventId, userId]
        );

        res.json({ message: 'Successfully registered for event' });
    } catch (error) {
        console.error('Error registering for event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Unregister from event
router.delete('/:id/register', protect, async (req, res) => {
    try {
        const [result] = await db.execute(
            'DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        res.json({ message: 'Successfully unregistered from event' });
    } catch (error) {
        console.error('Error unregistering from event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get event attendees (admin only)
router.get('/:id/attendees', protect, admin, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.full_name, u.email, er.created_at as rsvp_date
            FROM event_rsvps er
            JOIN users u ON er.user_id = u.id
            WHERE er.event_id = ?
            ORDER BY er.created_at ASC
        `;

        const [attendees] = await db.execute(query, [req.params.id]);
        res.json(attendees);
    } catch (error) {
        console.error('Error fetching attendees:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
