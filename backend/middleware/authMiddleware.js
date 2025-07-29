// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        // If no token, redirect to login for page requests, or send 401 for API requests
        return req.accepts('html')
            ? res.redirect('/login.html')
            : res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await db.query('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [decoded.id]);
        
        if (rows.length === 0) {
            throw new Error('User not found');
        }
        
        const user = rows[0];
        
        // Check if user is approved (only for non-admin users)
        if (user.role !== 'admin' && user.status !== 'approved') {
            // For API requests, return status error
            if (!req.accepts('html')) {
                return res.status(403).json({ 
                    message: user.status === 'pending' 
                        ? 'Your account is pending admin approval. You will be able to log in once approved.'
                        : 'Your account has been rejected or disabled. Please contact support.',
                    errors: { status: user.status }
                });
            }
            
            // For page requests, redirect to login with message
            return res.redirect('/login.html?message=' + encodeURIComponent(
                user.status === 'pending' 
                    ? 'Your account is pending admin approval. You will be able to log in once approved.'
                    : 'Your account has been rejected or disabled. Please contact support.'
            ));
        }
        
        req.user = user; // Attach user to the request
        next();
    } catch (error) {
        return req.accepts('html')
            ? res.redirect('/login.html')
            : res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        // Forbid access
        return req.accepts('html')
            ? res.redirect('/member_dashboard.html') // Redirect if it's a page request
            : res.status(403).json({ message: 'Not authorized as an admin' }); // Send error for API request
    }
};

module.exports = { protect, admin };