// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            console.log('No token found in cookies');
            // If no token, redirect to login for page requests, or send 401 for API requests
            return req.accepts('html')
                ? res.redirect('/login.html')
                : res.status(401).json({ message: 'Not authorized, no token' });
        }

        console.log('Token found, verifying...');
        
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET not found in environment variables');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded for user ID:', decoded.id);
        
        const [rows] = await db.query('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [decoded.id]);
        
        if (rows.length === 0) {
            console.log('User not found in database for ID:', decoded.id);
            throw new Error('User not found');
        }
        
        const user = rows[0];
        console.log('User found:', user.email, 'Role:', user.role, 'Status:', user.status);
        
        // Check if user is approved (only for non-admin users)
        if (user.role !== 'admin' && user.status !== 'approved') {
            console.log('User access denied - status:', user.status);
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
        console.log('User authenticated successfully:', user.email);
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        return req.accepts('html')
            ? res.redirect('/login.html')
            : res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        console.log('Admin access granted for:', req.user.email);
        next();
    } else {
        console.log('Admin access denied for:', req.user ? req.user.email : 'unknown user');
        // Forbid access
        return req.accepts('html')
            ? res.redirect('/member_dashboard.html') // Redirect if it's a page request
            : res.status(403).json({ message: 'Not authorized as an admin' }); // Send error for API request
    }
};

module.exports = { protect, admin };