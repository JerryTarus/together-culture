
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Use Replit's PostgreSQL database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
});

console.log('🚀 Setting up PostgreSQL database for Together Culture CRM...');

async function setupDatabase() {
    try {
        await createTables();
        await createAdminUser();
        console.log('✅ Database setup completed successfully!');
    } catch (error) {
        console.error('❌ Database setup failed:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

async function createTables() {
    try {
        console.log('📊 Setting up database schema...');

        // Create users table (PostgreSQL syntax)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                bio TEXT,
                skills TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create events table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                location VARCHAR(255) NOT NULL,
                capacity INT NOT NULL DEFAULT 50,
                created_by INT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create event_rsvps table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS event_rsvps (
                id SERIAL PRIMARY KEY,
                event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'not_attending')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_id, user_id)
            )
        `);

        // Create resources table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resources (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_path VARCHAR(500),
                file_type VARCHAR(100),
                uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create conversations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                user1_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user2_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user1_id, user2_id)
            )
        `);

        // Create messages table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_status BOOLEAN DEFAULT FALSE
            )
        `);

        console.log('✅ All tables created successfully');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
}

async function createAdminUser() {
    try {
        const result = await pool.query("SELECT id FROM users WHERE email = 'admin@togetherculture.com'");
        
        if (result.rows.length > 0) {
            console.log('✅ Admin user already exists');
            return;
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        await pool.query(
            "INSERT INTO users (full_name, email, password, role, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
            ['Admin User', 'admin@togetherculture.com', hashedPassword, 'admin', 'approved']
        );
        
        console.log('✅ Admin user created successfully');
        console.log('📧 Email: admin@togetherculture.com');
        console.log('🔑 Password: admin123');
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        throw error;
    }
}

setupDatabase();
