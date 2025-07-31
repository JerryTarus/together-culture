
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all events with pagination, search, and filtering
router.get('/', protect, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = 'all', 
            sortBy = 'date', 
            sortOrder = 'DESC' 
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let queryParams = [];

        // Add search filter
        if (search) {
            whereClause += ' AND (title LIKE ? OR description LIKE ? OR location LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        // Add status filter
        if (status !== 'all') {
            if (status === 'upcoming') {
                whereClause += ' AND event_date >= CURDATE()';
            } else if (status === 'past') {
                whereClause += ' AND event_date < CURDATE()';
            } else if (status === 'active') {
                whereClause += ' AND status = "active"';
            } else if (status === 'cancelled') {
                whereClause += ' AND status = "cancelled"';
            }
        }

        // Validate sort parameters
        const validSortFields = ['title', 'date', 'created_at', 'capacity'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
        const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM events ${whereClause}`;
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;

        // Get events with RSVP counts
        const eventsQuery = `
            SELECT 
                e.*,
                e.event_date as date,
                COUNT(er.id) as rsvp_count,
                (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as attending_count
            FROM events e
            LEFT JOIN event_rsvps er ON e.id = er.event_id AND er.status = 'attending'
            ${whereClause}
            GROUP BY e.id
            ORDER BY ${sortField === 'date' ? 'e.event_date' : sortField} ${sortDirection}
            LIMIT ? OFFSET ?
        `;

        const [events] = await db.query(eventsQuery, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Format dates and add additional info
        const formattedEvents = events.map(event => ({
            ...event,
            date: new Date(event.date).toISOString(),
            created_at: new Date(event.created_at).toISOString(),
            updated_at: event.updated_at ? new Date(event.updated_at).toISOString() : null,
            is_past: new Date(event.date) < new Date(),
            spots_remaining: event.capacity ? Math.max(0, event.capacity - event.attending_count) : null
        }));

        res.json({
            success: true,
            data: formattedEvents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
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
        const { id } = req.params;
        
        const [events] = await db.query(`
            SELECT 
                e.*,
                e.event_date as date,
                COUNT(er.id) as rsvp_count,
                (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'attending') as attending_count
            FROM events e
            LEFT JOIN event_rsvps er ON e.id = er.event_id AND er.status = 'attending'
            WHERE e.id = ?
            GROUP BY e.id
        `, [id]);

        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const event = events[0];
        event.date = new Date(event.date).toISOString();
        event.created_at = new Date(event.created_at).toISOString();
        event.updated_at = event.updated_at ? new Date(event.updated_at).toISOString() : null;
        event.is_past = new Date(event.date) < new Date();
        event.spots_remaining = event.capacity ? Math.max(0, event.capacity - event.attending_count) : null;

        res.json({
            success: true,
            data: event
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
        const { title, description, date, time, location, capacity, status = 'active' } = req.body;

        // Validate required fields
        if (!title || !description || !date || !time || !location) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: title, description, date, time, location'
            });
        }

        // Combine date and time
        const eventDateTime = new Date(`${date}T${time}`);
        if (isNaN(eventDateTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date or time format'
            });
        }

        const [result] = await db.query(`
            INSERT INTO events (title, description, event_date, location, capacity, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [title, description, eventDateTime, location, capacity || null, status, req.user.id]);

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: { id: result.insertId }
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
        const { id } = req.params;
        const { title, description, date, time, location, capacity, status } = req.body;

        // Check if event exists
        const [existingEvents] = await db.query('SELECT id FROM events WHERE id = ?', [id]);
        if (existingEvents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (date !== undefined && time !== undefined) {
            const eventDateTime = new Date(`${date}T${time}`);
            if (!isNaN(eventDateTime.getTime())) {
                updateFields.push('event_date = ?');
                updateValues.push(eventDateTime);
            }
        }
        if (location !== undefined) {
            updateFields.push('location = ?');
            updateValues.push(location);
        }
        if (capacity !== undefined) {
            updateFields.push('capacity = ?');
            updateValues.push(capacity || null);
        }
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateFields.push('updated_at = NOW()');
        updateValues.push(id);

        await db.query(`
            UPDATE events 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        res.json({
            success: true,
            message: 'Event updated successfully'
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
        const { id } = req.params;

        // Check if event exists
        const [existingEvents] = await db.query('SELECT id FROM events WHERE id = ?', [id]);
        if (existingEvents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Delete associated RSVPs first
        await db.query('DELETE FROM event_rsvps WHERE event_id = ?', [id]);
        
        // Delete the event
        await db.query('DELETE FROM events WHERE id = ?', [id]);

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
        const { id } = req.params;
        const { status = 'attending' } = req.body;

        // Check if event exists and get capacity
        const [events] = await db.query('SELECT * FROM events WHERE id = ?', [id]);
        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const event = events[0];

        // Check if event is in the past
        if (new Date(event.event_date) < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot RSVP to past events'
            });
        }

        // Check capacity if attending
        if (status === 'attending' && event.capacity) {
            const [rsvpCount] = await db.query(
                'SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = ? AND status = "attending"',
                [id]
            );
            
            if (rsvpCount[0].count >= event.capacity) {
                return res.status(400).json({
                    success: false,
                    message: 'Event is at full capacity'
                });
            }
        }

        // Check if user already has an RSVP
        const [existingRsvp] = await db.query(
            'SELECT id FROM event_rsvps WHERE event_id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingRsvp.length > 0) {
            // Update existing RSVP
            await db.query(
                'UPDATE event_rsvps SET status = ?, updated_at = NOW() WHERE event_id = ? AND user_id = ?',
                [status, id, req.user.id]
            );
        } else {
            // Create new RSVP
            await db.query(
                'INSERT INTO event_rsvps (event_id, user_id, status, created_at) VALUES (?, ?, ?, NOW())',
                [id, req.user.id, status]
            );
        }

        res.json({
            success: true,
            message: `RSVP updated to ${status}`
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

// Get user's RSVP status for an event
router.get('/:id/rsvp', protect, async (req, res) => {
    try {
        const { id } = req.params;

        const [rsvps] = await db.query(
            'SELECT status FROM event_rsvps WHERE event_id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({
            success: true,
            data: {
                status: rsvps.length > 0 ? rsvps[0].status : null
            }
        });

    } catch (error) {
        console.error('Error fetching RSVP status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch RSVP status',
            error: error.message
        });
    }
});

// Get event attendees (admin only)
router.get('/:id/attendees', protect, admin, async (req, res) => {
    try {
        const { id } = req.params;

        const [attendees] = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                er.status,
                er.created_at as rsvp_date
            FROM event_rsvps er
            JOIN users u ON er.user_id = u.id
            WHERE er.event_id = ?
            ORDER BY er.created_at DESC
        `, [id]);

        res.json({
            success: true,
            data: attendees
        });

    } catch (error) {
        console.error('Error fetching attendees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendees',
            error: error.message
        });
    }
});

module.exports = router;
