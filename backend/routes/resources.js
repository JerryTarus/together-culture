// backend/routes/resources.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only documents, images, and archives are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Max 5 files at once
    }
});

// GET /api/resources - Get all resources with filtering and pagination
router.get('/', protect, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            category = 'all', 
            search = '',
            sortBy = 'created_at',
            sortOrder = 'DESC',
            type = 'all'
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let whereClause = '1=1';
        let queryParams = [];
        
        // Filter by category
        if (category !== 'all') {
            whereClause += ' AND category = ?';
            queryParams.push(category);
        }
        
        // Filter by resource type
        if (type !== 'all') {
            if (type === 'document') {
                whereClause += ' AND file_type IN ("pdf", "doc", "docx", "txt")';
            } else if (type === 'spreadsheet') {
                whereClause += ' AND file_type IN ("xls", "xlsx", "csv")';
            } else if (type === 'image') {
                whereClause += ' AND file_type IN ("jpg", "jpeg", "png", "gif", "webp")';
            } else if (type === 'presentation') {
                whereClause += ' AND file_type IN ("ppt", "pptx")';
            }
        }
        
        // Search functionality
        if (search) {
            whereClause += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Sort validation
        const validSortColumns = ['created_at', 'title', 'file_size', 'downloads'];
        const validSortOrders = ['ASC', 'DESC'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        // Get total count for pagination
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM resources WHERE ${whereClause}`,
            queryParams
        );
        const totalResources = countResult[0].total;
        
        // Get resources with uploader info
        const [resources] = await db.query(`
            SELECT 
                r.*,
                u.full_name as uploaded_by_name
            FROM resources r
            LEFT JOIN users u ON r.uploaded_by = u.id
            WHERE ${whereClause}
            ORDER BY r.${sortColumn} ${sortDirection}
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), offset]);
        
        res.json({
            resources,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResources,
                totalPages: Math.ceil(totalResources / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ message: 'Error fetching resources' });
    }
});

// GET /api/resources/:id - Get single resource details
router.get('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [resources] = await db.query(`
            SELECT 
                r.*,
                u.full_name as uploaded_by_name,
                u.email as uploaded_by_email
            FROM resources r
            LEFT JOIN users u ON r.uploaded_by = u.id
            WHERE r.id = ?
        `, [id]);
        
        if (resources.length === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        
        res.json({ resource: resources[0] });
    } catch (error) {
        console.error('Error fetching resource:', error);
        res.status(500).json({ message: 'Error fetching resource' });
    }
});

// POST /api/resources - Upload new resource(s)
router.post('/', protect, upload.array('files', 5), async (req, res) => {
    try {
        const { title, description, category = 'general', tags = '', access_level = 'all' } = req.body;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({ 
                message: 'No files uploaded',
                errors: { files: 'At least one file is required' }
            });
        }
        
        // Validate required fields
        if (!title || !description) {
            // Clean up uploaded files if validation fails
            files.forEach(file => {
                fs.unlink(file.path, () => {});
            });
            
            return res.status(400).json({ 
                message: 'Title and description are required',
                errors: {
                    title: !title ? 'Title is required' : null,
                    description: !description ? 'Description is required' : null
                }
            });
        }
        
        const uploadedResources = [];
        
        for (const file of files) {
            try {
                // Get file extension
                const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
                
                // Insert resource record
                const [result] = await db.query(`
                    INSERT INTO resources (
                        title, description, category, tags, access_level,
                        file_name, file_path, file_size, file_type, mime_type,
                        uploaded_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    title,
                    description,
                    category,
                    tags,
                    access_level,
                    file.originalname,
                    file.filename, // This is the unique filename on disk
                    file.size,
                    fileExt,
                    file.mimetype,
                    req.user.id
                ]);
                
                uploadedResources.push({
                    id: result.insertId,
                    title: title,
                    file_name: file.originalname,
                    file_size: file.size
                });
                
                console.log(`✅ Resource uploaded: ${file.originalname} by ${req.user.email}`);
                
            } catch (error) {
                console.error('Error saving resource record:', error);
                // Clean up the uploaded file
                fs.unlink(file.path, () => {});
            }
        }
        
        if (uploadedResources.length === 0) {
            return res.status(500).json({ message: 'Failed to save any resources' });
        }
        
        res.status(201).json({
            message: `Successfully uploaded ${uploadedResources.length} resource(s)`,
            resources: uploadedResources
        });
        
    } catch (error) {
        console.error('Error uploading resources:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, () => {});
            });
        }
        
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    message: 'File too large. Maximum size is 10MB per file.',
                    errors: { files: 'File size limit exceeded' }
                });
            } else if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ 
                    message: 'Too many files. Maximum is 5 files per upload.',
                    errors: { files: 'File count limit exceeded' }
                });
            }
        }
        
        res.status(500).json({ message: 'Error uploading resources' });
    }
});

// PUT /api/resources/:id - Update resource metadata
router.put('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, tags, access_level } = req.body;
        
        // Check if resource exists and user has permission
        const [resources] = await db.query(
            'SELECT uploaded_by FROM resources WHERE id = ?',
            [id]
        );
        
        if (resources.length === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        
        const resource = resources[0];
        
        // Only allow the uploader or admin to edit
        if (resource.uploaded_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to edit this resource' });
        }
        
        // Validation
        if (!title || !description) {
            return res.status(400).json({ 
                message: 'Title and description are required',
                errors: {
                    title: !title ? 'Title is required' : null,
                    description: !description ? 'Description is required' : null
                }
            });
        }
        
        // Update resource
        await db.query(`
            UPDATE resources 
            SET title = ?, description = ?, category = ?, tags = ?, access_level = ?, updated_at = NOW()
            WHERE id = ?
        `, [title, description, category, tags, access_level, id]);
        
        // Get updated resource
        const [updatedResource] = await db.query(`
            SELECT 
                r.*,
                u.full_name as uploaded_by_name
            FROM resources r
            LEFT JOIN users u ON r.uploaded_by = u.id
            WHERE r.id = ?
        `, [id]);
        
        console.log(`✅ Resource updated: ${title} by ${req.user.email}`);
        
        res.json({
            message: 'Resource updated successfully',
            resource: updatedResource[0]
        });
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ message: 'Error updating resource' });
    }
});

// DELETE /api/resources/:id - Delete resource
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get resource info
        const [resources] = await db.query(
            'SELECT title, file_path, uploaded_by FROM resources WHERE id = ?',
            [id]
        );
        
        if (resources.length === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        
        const resource = resources[0];
        
        // Only allow the uploader or admin to delete
        if (resource.uploaded_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this resource' });
        }
        
        // Delete file from disk
        const filePath = path.join(uploadsDir, resource.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Delete from database
        await db.query('DELETE FROM resources WHERE id = ?', [id]);
        
        console.log(`✅ Resource deleted: ${resource.title} by ${req.user.email}`);
        
        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({ message: 'Error deleting resource' });
    }
});

// GET /api/resources/:id/download - Download resource file
router.get('/:id/download', protect, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get resource info
        const [resources] = await db.query(`
            SELECT title, file_name, file_path, file_size, mime_type, access_level
            FROM resources 
            WHERE id = ?
        `, [id]);
        
        if (resources.length === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }
        
        const resource = resources[0];
        
        // Check access permissions
        if (resource.access_level === 'admin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required for this resource' });
        }
        
        // Get file path
        const filePath = path.join(uploadsDir, resource.file_path);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }
        
        // Increment download counter
        await db.query(
            'UPDATE resources SET downloads = downloads + 1 WHERE id = ?',
            [id]
        );
        
        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${resource.file_name}"`);
        res.setHeader('Content-Type', resource.mime_type);
        res.setHeader('Content-Length', resource.file_size);
        
        // Stream file to response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        console.log(`✅ Resource downloaded: ${resource.title} by ${req.user.email}`);
        
    } catch (error) {
        console.error('Error downloading resource:', error);
        res.status(500).json({ message: 'Error downloading resource' });
    }
});

// GET /api/resources/categories - Get available categories
router.get('/categories', protect, async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT category, COUNT(*) as count
            FROM resources
            GROUP BY category
            ORDER BY count DESC, category ASC
        `);
        
        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
});

// GET /api/resources/count - Get total resource count
router.get('/count', protect, async (req, res) => {
    try {
        const [result] = await db.query('SELECT COUNT(*) as count FROM resources');
        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching resource count:', error);
        res.status(500).json({ message: 'Error fetching resource count' });
    }
});

// GET /api/resources/stats - Get resource statistics (admin only)
router.get('/stats', protect, admin, async (req, res) => {
    try {
        // Get overall stats
        const [overallStats] = await db.query(`
            SELECT 
                COUNT(*) as total_resources,
                SUM(file_size) as total_size,
                SUM(downloads) as total_downloads,
                AVG(file_size) as avg_file_size
            FROM resources
        `);
        
        // Get stats by category
        const [categoryStats] = await db.query(`
            SELECT 
                category,
                COUNT(*) as count,
                SUM(file_size) as total_size,
                SUM(downloads) as total_downloads
            FROM resources
            GROUP BY category
            ORDER BY count DESC
        `);
        
        // Get stats by file type
        const [typeStats] = await db.query(`
            SELECT 
                file_type,
                COUNT(*) as count,
                SUM(downloads) as total_downloads
            FROM resources
            GROUP BY file_type
            ORDER BY count DESC
            LIMIT 10
        `);
        
        // Get recent uploads
        const [recentUploads] = await db.query(`
            SELECT 
                r.title,
                r.created_at,
                u.full_name as uploaded_by_name
            FROM resources r
            LEFT JOIN users u ON r.uploaded_by = u.id
            ORDER BY r.created_at DESC
            LIMIT 10
        `);
        
        res.json({
            overall: overallStats[0],
            by_category: categoryStats,
            by_type: typeStats,
            recent_uploads: recentUploads
        });
    } catch (error) {
        console.error('Error fetching resource stats:', error);
        res.status(500).json({ message: 'Error fetching resource stats' });
    }
});

module.exports = router;