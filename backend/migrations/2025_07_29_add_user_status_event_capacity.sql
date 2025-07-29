-- Migration: Add user status (approval workflow) and event capacity

-- Add status to users table
ALTER TABLE users ADD COLUMN status ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER role;

-- Add capacity to events table
ALTER TABLE events ADD COLUMN capacity INT DEFAULT 0 AFTER location;
