const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
// Register new user
router.post('/register', async (req, res) => {
    const { full_name, email, password } = req.body;
    
    // Input validation
    if (!full_name || !email || !password) {
        return res.status(400).json({ 
            message: 'Please provide all required fields.',
            errors: {
                full_name: !full_name ? 'Full name is required' : null,
                email: !email ? 'Email is required' : null,
                password: !password ? 'Password is required' : null
            }
        });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            message: 'Please provide a valid email address.',
            errors: { email: 'Invalid email format' }
        });
    }
    
    // Password strength validation
    if (password.length < 6) {
        return res.status(400).json({ 
            message: 'Password must be at least 6 characters long.',
            errors: { password: 'Password too short' }
        });
    }
    
    try {
        // Check if user already exists
        const [existingUser] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ 
                message: 'A user with this email already exists.',
                errors: { email: 'Email already registered' }
            });
        }
        
        // Hash password and create user
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [full_name, email, hashedPassword, 'member', 'pending']
        );
        
        console.log(`New user registered (PENDING): ${email} (ID: ${result.insertId})`);
        
        res.status(201).json({ 
            message: 'Registration successful! Your account is pending admin approval. You will be able to log in once approved.',
            success: true
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ 
            message: 'Server error during registration. Please try again later.',
            errors: { server: 'Internal server error' }
        });
    }
});
// Login user
router.post('/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;
    
    console.log('Login attempt for email:', email);
    
    // Input validation
    if (!email || !password) {
        console.log('Login failed: Missing email or password');
        return res.status(400).json({ 
            message: 'Please provide both email and password.',
            errors: {
                email: !email ? 'Email is required' : null,
                password: !password ? 'Password is required' : null
            }
        });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('Login failed: Invalid email format');
        return res.status(400).json({ 
            message: 'Please provide a valid email address.',
            errors: { email: 'Invalid email format' }
        });
    }
    
    try {
        console.log('Searching for user in database...');
        // Find user by email
        const [users] = await db.query(
            'SELECT id, full_name, email, password, role, status, created_at, last_login FROM users WHERE email = ?', 
            [email]
        );
        
        if (users.length === 0) {
            console.log('Login failed: User not found for email:', email);
            return res.status(401).json({ 
                message: 'Invalid credentials.',
                errors: { credentials: 'Email or password is incorrect' }
            });
        }
        
        const user = users[0];
        console.log('User found:', user.email, 'Role:', user.role, 'Status:', user.status);
        
        // Verify password
        console.log('Verifying password...');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Login failed: Invalid password for user:', email);
            return res.status(401).json({ 
                message: 'Invalid credentials.',
                errors: { credentials: 'Email or password is incorrect' }
            });
        }
        
        console.log('Password verified successfully');
        
        // Check if user is approved (only for non-admin users)
        if (user.role !== 'admin' && user.status !== 'approved') {
            console.log('Login blocked: User status is', user.status);
            return res.status(403).json({
                message: user.status === 'pending'
                    ? 'Your account is pending admin approval. You will be able to log in once approved.'
                    : 'Your account has been rejected or disabled. Please contact support.',
                errors: { status: user.status }
            });
        }
        
        // Update last login timestamp
        console.log('Updating last login timestamp...');
        await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        
        // Generate JWT token
        console.log('Generating JWT token...');
        
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET not found in environment variables');
            return res.status(500).json({ 
                message: 'Server configuration error.',
                errors: { server: 'JWT configuration missing' }
            });
        }
        
        const payload = { 
            id: user.id, 
            role: user.role,
            email: user.email
        };
        
        const tokenExpiry = rememberMe ? '30d' : '1d';
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: tokenExpiry });
        
        // Set cookie expiration
        const oneDay = 24 * 60 * 60 * 1000;
        const thirtyDays = 30 * oneDay;
        const cookieExpiry = rememberMe ? thirtyDays : oneDay;
        
        // Set secure cookie
        console.log('Setting authentication cookie...');
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: new Date(Date.now() + cookieExpiry),
            sameSite: 'Lax'
        });
        
        console.log(`✅ User logged in successfully: ${email} (ID: ${user.id}, Role: ${user.role}, Status: ${user.status})`);
        
        res.status(200).json({
            message: 'Logged in successfully',
            success: true,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ 
            message: 'Server error during login. Please try again later.',
            errors: { server: 'Internal server error' }
        });
    }
});
// Logout user
router.post('/logout', (req, res) => {
    try {
        // Clear the authentication cookie
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: new Date(0),
            sameSite: 'Lax'
        });
        
        console.log('User logged out successfully');
        
        res.status(200).json({ 
            message: 'Logged out successfully.',
            success: true
        });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ 
            message: 'Error during logout.',
            errors: { server: 'Internal server error' }
        });
    }
});
module.exports = router;