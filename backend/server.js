// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Import middleware
const { protect, admin } = require('./middleware/authMiddleware');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - more permissive for development
app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow any localhost or 127.0.0.1 origin for development
        if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
            return callback(null, true);
        }
        
        // Allow the backend's own origin
        if (origin === `http://localhost:${PORT}`) {
            return callback(null, true);
        }
        
        // For development, be more permissive
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        // For production, you should restrict this to your actual domain
        callback(new Error('Not allowed by CORS'));
    }
}));

app.use(express.json());
app.use(cookieParser());

// Add request logging for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.method === 'POST' && req.path.includes('/auth/')) {
        console.log('Auth request body keys:', Object.keys(req.body));
    }
    next();
});

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/events'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/messages', require('./routes/messages'));

// --- PROTECTED PAGE ROUTES ---
// This middleware runs BEFORE the static file server.
// It checks for authentication and authorization for specific pages.

// 1. Protect all admin pages
// Make sure these .html files exist in your frontend directory
app.get(['/admin_dashboard.html', '/member_directory.html'], protect, admin, (req, res, next) => {
    // If the 'protect' and 'admin' middleware passed, allow serving the file.
    next();
});

// 2. Protect all member pages
// Make sure these .html files exist in your frontend directory
app.get(['/member_dashboard.html', '/events.html', '/messages.html', '/resources.html', '/settings.html'], protect, (req, res, next) => {
    // If the 'protect' middleware passed, allow serving the file.
    next();
});

// --- SERVE ALL FRONTEND FILES ---
// This will only be reached for pages if the protection middleware above calls 'next()'.
// It also serves all public files like CSS, public JS, and images.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- FINAL FALLBACK ---
// FIXED: Changed '*' to '*splat' to provide a name for the wildcard parameter
// as required by path-to-regexp v7+.
// Serve 404 for missing static files, fallback to index.html only for unknown routes
app.use((req, res, next) => {
    const filePath = path.join(__dirname, '..', 'frontend', req.path);
    if (req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        } else {
            return res.status(404).sendFile(path.join(__dirname, '..', 'frontend', '404.html'));
        }
    }
    // Fallback for client-side routing (SPA)
    res.sendFile(path.resolve(__dirname, '..', 'frontend', 'index.html'));
});
// --- END OF FIX ---

app.listen(PORT, () => {
    console.log(`🚀 Secure MPA Server is fully operational on http://localhost:${PORT}`);
    console.log(`📂 Serving frontend from: ${path.join(__dirname, '..', 'frontend')}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
