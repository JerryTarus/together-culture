-- Create admin user for Together Culture CRM
-- IMPORTANT: Use the Node.js script (create-admin.js) instead of this SQL
-- This SQL is provided for reference only - the password hash needs to be generated properly

-- If you must use SQL directly, first generate a bcrypt hash for 'admin123456'
-- and replace the password field below

INSERT INTO users (
    full_name, 
    email, 
    password, 
    role, 
    bio, 
    skills, 
    created_at
) VALUES (
    'Together Culture Admin',
    'admin@togetherculture.com',
    -- Replace this with a proper bcrypt hash
    '$2a$10$REPLACE_WITH_ACTUAL_BCRYPT_HASH',
    'admin',
    'System Administrator for Together Culture CRM',
    'Administration, Management, Community Building',
    NOW()
);

-- RECOMMENDED: Use the create-admin.js script instead:
-- cd backend
-- node create-admin.js
