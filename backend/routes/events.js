const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all events with pagination and filtering
router.get('/', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const sortBy = req.query.sortBy || 'event_date';
        const sortOrder = req.query.sortOrder || 'DESC';

        // Build WHERE clause
        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = 'WHERE (title LIKE ? OR description LIKE ? OR location LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM events ${whereClause}`;
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;

        // Get events
        const eventsQuery = `
            SELECT 
                id,
                title,
                description,
                event_date,
                location,
                capacity,
                created_at,
                updated_at,
                (SELECT COUNT(*) FROM event_rsvps WHERE event_id = events.id) as rsvp_count
            FROM events 
            ${whereClause}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        queryParams.push(limit, offset);
        const [events] = await db.query(eventsQuery, queryParams);

        // Fetch RSVP status for current user for all events in one query
        const eventIds = events.map(e => e.id);
        let userRsvps = [];
        if (eventIds.length > 0) {
            const [userRsvpsResult] = await db.query(
                `SELECT event_id, status FROM event_rsvps WHERE user_id = ? AND event_id IN (${eventIds.map(() => '?').join(',')})`,
                [req.user.id, ...eventIds]
            );
            userRsvps = userRsvpsResult;
        }
        // Attach RSVP status to each event
        events.forEach(event => {
            const rsvp = userRsvps.find(r => r.event_id === event.id);
            event.user_rsvp_status = rsvp ? rsvp.status : null;
        });

        res.json({
            success: true,
            data: events,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events',
            error: error.message
        });
    }
});

// Get single event by ID
router.get('/:id', protect, async (req, res) => {
    try {
        const eventId = req.params.id;

        const [events] = await db.query(`
            SELECT 
                id,
                title,
                description,
                event_date,
                location,
                capacity,
                created_at,
                updated_at,
                (SELECT COUNT(*) FROM event_rsvps WHERE event_id = events.id) as rsvp_count
            FROM events 
            WHERE id = ?
        `, [eventId]);

        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Get RSVPs for this event
        const [rsvps] = await db.query(`
            SELECT 
                er.id,
                er.user_id,
                er.status,
                er.created_at,
                u.full_name,
                u.email
            FROM event_rsvps er
            JOIN users u ON er.user_id = u.id
            WHERE er.event_id = ?
            ORDER BY er.created_at DESC
        `, [eventId]);

        res.json({
            success: true,
            data: {
                ...events[0],
                rsvps
            }
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch event',
            error: error.message
        });
    }
});

// Create new event (admin only)
router.post('/', protect, admin, async (req, res) => {
    try {
        const { title, description, event_date, location, capacity } = req.body;

        // Validate required fields
        if (!title || !description || !event_date || !location) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, event date, and location are required'
            });
        }

        const [result] = await db.query(`
            INSERT INTO events (title, description, event_date, location, capacity)
            VALUES (?, ?, ?, ?, ?)
        `, [title, description, event_date, location, capacity || 0]);

        // Get the created event
        const [newEvent] = await db.query(`
            SELECT 
                id,
                title,
                description,
                event_date,
                location,
                capacity,
                created_at,
                updated_at
            FROM events 
            WHERE id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: newEvent[0]
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create event',
            error: error.message
        });
    }
});

// Update event (admin only)
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const eventId = req.params.id;
        const { title, description, event_date, location, capacity } = req.body;

        // Check if event exists
        const [existingEvent] = await db.query('SELECT id FROM events WHERE id = ?', [eventId]);
        if (existingEvent.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Validate required fields
        if (!title || !description || !event_date || !location) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, event date, and location are required'
            });
        }

        await db.query(`
            UPDATE events 
            SET title = ?, description = ?, event_date = ?, location = ?, capacity = ?, updated_at = NOW()
            WHERE id = ?
        `, [title, description, event_date, location, capacity || 0, eventId]);

        // Get the updated event
        const [updatedEvent] = await db.query(`
            SELECT 
                id,
                title,
                description,
                event_date,
                location,
                capacity,
                created_at,
                updated_at
            FROM events 
            WHERE id = ?
        `, [eventId]);

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: updatedEvent[0]
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update event',
            error: error.message
        });
    }
});

// Delete event (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const eventId = req.params.id;

        // Check if event exists
        const [existingEvent] = await db.query('SELECT id FROM events WHERE id = ?', [eventId]);
        if (existingEvent.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Delete RSVPs first (foreign key constraint)
        await db.query('DELETE FROM event_rsvps WHERE event_id = ?', [eventId]);

        // Delete the event
        await db.query('DELETE FROM events WHERE id = ?', [eventId]);

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete event',
            error: error.message
        });
    }
});

// RSVP to event
router.post('/:id/rsvp', protect, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const { status = 'attending' } = req.body;

        // Check if event exists
        const [event] = await db.query('SELECT id, capacity FROM events WHERE id = ?', [eventId]);
        if (event.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check if user already RSVPed
        const [existingRsvp] = await db.query(
            'SELECT id FROM event_rsvps WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        if (existingRsvp.length > 0) {
            // Update existing RSVP
            await db.query(
                'UPDATE event_rsvps SET status = ?, updated_at = NOW() WHERE event_id = ? AND user_id = ?',
                [status, eventId, userId]
            );
        } else {
            // Create new RSVP
            await db.query(
                'INSERT INTO event_rsvps (event_id, user_id, status) VALUES (?, ?, ?)',
                [eventId, userId, status]
            );
        }

        res.json({
            success: true,
            message: 'RSVP updated successfully'
        });
    } catch (error) {
        console.error('Error updating RSVP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update RSVP',
            error: error.message
        });
    }
});

module.exports = router;