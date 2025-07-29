-- Migration: Approve admin account
-- Replace the email below with your actual admin email if needed
UPDATE users SET status = 'approved' WHERE role = 'admin';
