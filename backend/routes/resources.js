// backend/routes/resources.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// POST /api/resources - Upload a new resource (Admin only)
// Upload a new resource (admin only)
router.post('/', protect, admin, upload.single('resourceFile'), async (req, res) => {
    const { title } = req.body;
    const file = req.file;
    if (!title || !file) {
        return res.status(400).json({ message: 'Please provide a title and a file.' });
    }
    try {
        // Store both the file path (for download) and the original filename
        await db.query(
            'INSERT INTO resources (title, file_url, original_name, uploaded_by) VALUES (?, ?, ?, ?)',
            [title, `/uploads/${file.filename}`, file.originalname, req.user.id]
        );
        res.status(201).json({ message: 'Resource uploaded successfully.' });
    } catch (err) {
        console.error('Error uploading resource:', err);
        res.status(500).json({ message: 'Server error while uploading resource.' });
    }
});

// GET /api/resources - Get all resources
// Get all resources (all members)
router.get('/', protect, async (req, res) => {
    try {
        const [resources] = await db.query("SELECT * FROM resources ORDER BY uploaded_at DESC");
        res.json(resources);
    } catch (err) {
        console.error('Error fetching resources:', err);
        res.status(500).json({ message: 'Server error while fetching resources.' });
    }
});

// Get resource count
router.get('/count', protect, async (req, res) => {
    try {
        const [result] = await db.query("SELECT COUNT(*) as count FROM resources");
        res.json({ count: result[0].count });
    } catch (err) {
        console.error('Error fetching resource count:', err);
        res.status(500).json({ message: 'Server error while fetching resource count.' });
    }
});

// DELETE /api/resources/:id - Delete a resource (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT file_url, original_name FROM resources WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Resource not found.' });
        }
        const filePath = path.join(__dirname, '..', rows[0].file_url);
        await db.query('DELETE FROM resources WHERE id = ?', [req.params.id]);
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file:", err);
        });
        res.json({ message: 'Resource deleted successfully.' });
    } catch (err) { res.status(500).send('Server Error'); }
});

module.exports = router;