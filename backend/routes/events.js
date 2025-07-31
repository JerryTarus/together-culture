const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const db = require('../config/db');

// Get all events
router.get('/', protect, async (req, res) => {
    try {
        const query = `
            SELECT e.*, 
                   COUNT(er.user_id) as current_rsvps,
                   (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND user_id = ?) as user_rsvp
            FROM events e
            LEFT JOIN event_rsvps er ON e.id = er.event_id
            WHERE e.date >= CURDATE()
            GROUP BY e.id
            ORDER BY e.date ASC
        `;

        const [events] = await db.execute(query, [req.user.id]);
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single event
router.get('/:id', protect, async (req, res) => {
    try {
        const query = `
            SELECT e.*, 
                   COUNT(er.user_id) as current_rsvps,
                   (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND user_id = ?) as user_rsvp
            FROM events e
            LEFT JOIN event_rsvps er ON e.id = er.event_id
            WHERE e.id = ?
            GROUP BY e.id
        `;

        const [events] = await db.execute(query, [req.user.id, req.params.id]);

        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(events[0]);
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
            title, description, date, time, location, capacity || 0, req.user.id
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
                capacity: capacity || 0
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
            title, description, date, time, location, capacity || 0, req.params.id
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

// RSVP to event
router.post('/:id/rsvp', protect, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        // Check if event exists and get capacity
        const [events] = await db.execute('SELECT * FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const event = events[0];

        // Check if user already RSVPed
        const [existingRsvp] = await db.execute(
            'SELECT * FROM event_rsvps WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        if (existingRsvp.length > 0) {
            return res.status(400).json({ message: 'You have already RSVPed to this event' });
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

        // Create RSVP
        await db.execute(
            'INSERT INTO event_rsvps (event_id, user_id) VALUES (?, ?)',
            [eventId, userId]
        );

        res.json({ message: 'RSVP successful' });
    } catch (error) {
        console.error('Error creating RSVP:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Cancel RSVP
router.delete('/:id/rsvp', protect, async (req, res) => {
    try {
        const [result] = await db.execute(
            'DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'RSVP not found' });
        }

        res.json({ message: 'RSVP cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling RSVP:', error);
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