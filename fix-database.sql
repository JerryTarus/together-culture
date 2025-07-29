-- Fix database schema issues
USE together_culture;

-- Check if status column exists and add it if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER role;

-- Check if capacity column exists and add it if missing  
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 0 AFTER location;

-- Update admin user to have approved status
UPDATE users SET status = 'approved' WHERE role = 'admin';

-- Show current users and their status
SELECT id, full_name, email, role, status FROM users; 