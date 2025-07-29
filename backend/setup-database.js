const bcrypt = require('bcryptjs');
const db = require('./config/db');

// Complete database setup and seeding
async function setupDatabase() {
    try {
        console.log('🚀 Starting Together Culture CRM database setup...');
        
        // Test database connection
        await db.testConnection();
        
        // 1. Create/Update table schemas
        console.log('📊 Setting up database schema...');
        await createTables();
        
        // 2. Run migrations
        console.log('🔄 Running migrations...');
        await runMigrations();
        
        // 3. Create admin user
        console.log('👤 Creating admin user...');
        await createAdminUser();
        
        // 4. Create dummy users
        console.log('👥 Creating dummy users...');
        await createDummyUsers();
        
        // 5. Create sample events
        console.log('📅 Creating sample events...');
        await createSampleEvents();
        
        // 6. Create sample visits
        console.log('✅ Creating sample visits...');
        await createSampleVisits();
        
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('👤 Admin: admin@togetherculture.com / admin123');
        console.log('👥 Members: Use any email from the list with password: password123');
        console.log('\n🔗 Access the application at: http://localhost:5000');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
    } finally {
        process.exit(0);
    }
}

// Create base tables
async function createTables() {
    try {
        // Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(255),
                role ENUM('admin', 'member') DEFAULT 'member',
                status ENUM('pending','approved','rejected') DEFAULT 'pending',
                bio TEXT,
                skills TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL
            ) ENGINE=InnoDB
        `);

        // Events table
        await db.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(150),
                description TEXT,
                event_date DATE,
                location VARCHAR(100),
                capacity INT DEFAULT 0
            ) ENGINE=InnoDB
        `);

        // Visits table
        await db.query(`
            CREATE TABLE IF NOT EXISTS visits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                event_id INT NOT NULL,
                visit_date DATE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Resources table
        await db.query(`
            CREATE TABLE IF NOT EXISTS resources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(150),
                file_url VARCHAR(255),
                original_name VARCHAR(255),
                uploaded_by INT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB
        `);

        // Conversations table
        await db.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user1_id INT NOT NULL,
                user2_id INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_pair (user1_id, user2_id),
                CONSTRAINT fk_user1 FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_user2 FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Messages table
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                sender_id INT NOT NULL,
                message TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_status BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        console.log('✅ Database tables created/verified');
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
}

// Run any necessary migrations
async function runMigrations() {
    try {
        // Check if status column exists in users table
        const [statusColumn] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'together_culture' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'status'
        `);

        if (statusColumn.length === 0) {
            await db.query(`
                ALTER TABLE users ADD COLUMN status ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER role
            `);
            console.log('✅ Added status column to users table');
        }

        // Check if capacity column exists in events table
        const [capacityColumn] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'together_culture' 
            AND TABLE_NAME = 'events' 
            AND COLUMN_NAME = 'capacity'
        `);

        if (capacityColumn.length === 0) {
            await db.query(`
                ALTER TABLE events ADD COLUMN capacity INT DEFAULT 0 AFTER location
            `);
            console.log('✅ Added capacity column to events table');
        }

        console.log('✅ Migrations completed');
    } catch (error) {
        console.error('❌ Error running migrations:', error);
        throw error;
    }
}

// Create admin user
async function createAdminUser() {
    try {
        const [existingAdmin] = await db.query("SELECT id FROM users WHERE email = 'admin@togetherculture.com'");
        
        if (existingAdmin.length > 0) {
            console.log('✅ Admin user already exists');
            return;
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        await db.query(
            "INSERT INTO users (full_name, email, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
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

// Sample data for dummy users
const dummyUsers = [
    { full_name: 'Sarah Johnson', email: 'sarah.johnson@example.com', bio: 'Creative director with 10+ years experience in digital media', skills: 'Design, Project Management, Creative Direction' },
    { full_name: 'Michael Chen', email: 'michael.chen@example.com', bio: 'Software engineer passionate about sustainable technology', skills: 'JavaScript, React, Node.js, Sustainability' },
    { full_name: 'Emma Rodriguez', email: 'emma.rodriguez@example.com', bio: 'Community organizer and social justice advocate', skills: 'Community Building, Event Planning, Advocacy' },
    { full_name: 'David Thompson', email: 'david.thompson@example.com', bio: 'Environmental scientist working on climate solutions', skills: 'Research, Data Analysis, Climate Science' },
    { full_name: 'Lisa Wang', email: 'lisa.wang@example.com', bio: 'Artist and educator focused on cultural preservation', skills: 'Art, Education, Cultural Heritage' },
    { full_name: 'James Wilson', email: 'james.wilson@example.com', bio: 'Entrepreneur building sustainable business models', skills: 'Business Strategy, Sustainability, Leadership' },
    { full_name: 'Maria Garcia', email: 'maria.garcia@example.com', bio: 'Social worker dedicated to community development', skills: 'Social Work, Community Development, Counseling' },
    { full_name: 'Robert Kim', email: 'robert.kim@example.com', bio: 'Urban planner creating inclusive city spaces', skills: 'Urban Planning, Architecture, Community Engagement' },
    { full_name: 'Jennifer Lee', email: 'jennifer.lee@example.com', bio: 'Marketing specialist for social impact organizations', skills: 'Marketing, Social Media, Brand Strategy' },
    { full_name: 'Christopher Brown', email: 'christopher.brown@example.com', bio: 'Musician and music therapist', skills: 'Music, Therapy, Performance' },
    { full_name: 'Amanda Davis', email: 'amanda.davis@example.com', bio: 'Food justice advocate and community gardener', skills: 'Agriculture, Food Security, Community Organizing' },
    { full_name: 'Kevin Martinez', email: 'kevin.martinez@example.com', bio: 'Youth mentor and educational program coordinator', skills: 'Youth Development, Education, Mentoring' },
    { full_name: 'Rachel Green', email: 'rachel.green@example.com', bio: 'Sustainability consultant and environmental educator', skills: 'Sustainability, Education, Consulting' },
    { full_name: 'Daniel White', email: 'daniel.white@example.com', bio: 'Photographer documenting social change movements', skills: 'Photography, Documentary, Visual Storytelling' },
    { full_name: 'Sophie Taylor', email: 'sophie.taylor@example.com', bio: 'Dance instructor and movement therapist', skills: 'Dance, Movement Therapy, Performance' },
    { full_name: 'Thomas Anderson', email: 'thomas.anderson@example.com', bio: 'Tech entrepreneur focused on social innovation', skills: 'Technology, Innovation, Entrepreneurship' },
    { full_name: 'Natalie Clark', email: 'natalie.clark@example.com', bio: 'Mental health advocate and wellness coach', skills: 'Mental Health, Wellness, Coaching' },
    { full_name: 'Ryan Mitchell', email: 'ryan.mitchell@example.com', bio: 'Renewable energy engineer and sustainability expert', skills: 'Engineering, Renewable Energy, Sustainability' },
    { full_name: 'Hannah Foster', email: 'hannah.foster@example.com', bio: 'Writer and communications specialist', skills: 'Writing, Communications, Content Creation' },
    { full_name: 'Andrew Perez', email: 'andrew.perez@example.com', bio: 'Community health worker and public health advocate', skills: 'Public Health, Community Health, Advocacy' }
];

// Create dummy users
async function createDummyUsers() {
    try {
        const [existingUsers] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'member'");
        
        if (existingUsers[0].count >= 20) {
            console.log('✅ Dummy users already exist');
            return;
        }

        console.log('🔄 Creating dummy users...');
        
        for (let i = 0; i < dummyUsers.length; i++) {
            const user = dummyUsers[i];
            
            // Check if user already exists
            const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [user.email]);
            if (existingUser.length > 0) {
                console.log(`⏭️  User ${user.full_name} already exists, skipping...`);
                continue;
            }
            
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash('password123', salt);
            
            // Randomly assign status (80% approved, 15% pending, 5% rejected)
            const statusOptions = ['approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'pending', 'pending', 'pending', 'rejected'];
            const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
            
            await db.query(
                "INSERT INTO users (full_name, email, password, role, status, bio, skills, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                [user.full_name, user.email, hashedPassword, 'member', randomStatus, user.bio, user.skills]
            );
            
            console.log(`✅ Created user: ${user.full_name} (${randomStatus})`);
        }
        
        console.log('✅ All dummy users created successfully');
        
    } catch (error) {
        console.error('❌ Error creating dummy users:', error);
        throw error;
    }
}

// Create sample events
async function createSampleEvents() {
    try {
        const [existingEvents] = await db.query("SELECT COUNT(*) as count FROM events");
        
        if (existingEvents[0].count >= 10) {
            console.log('✅ Sample events already exist');
            return;
        }

        const sampleEvents = [
            {
                title: 'Community Art Workshop',
                description: 'Join us for a creative session where we explore local art traditions and create collaborative pieces that reflect our community values.',
                event_date: '2025-02-15',
                location: 'Community Center - Main Hall',
                capacity: 25
            },
            {
                title: 'Sustainable Living Seminar',
                description: 'Learn practical tips for reducing your environmental footprint and living more sustainably in our urban environment.',
                event_date: '2025-02-20',
                location: 'Green Space - Conference Room',
                capacity: 30
            },
            {
                title: 'Digital Skills Workshop',
                description: 'Free workshop for community members to learn essential digital skills for the modern workplace.',
                event_date: '2025-02-25',
                location: 'Tech Hub - Computer Lab',
                capacity: 20
            },
            {
                title: 'Cultural Heritage Celebration',
                description: 'A day to celebrate and share the diverse cultural traditions that make our community unique.',
                event_date: '2025-03-01',
                location: 'Community Park - Amphitheater',
                capacity: 100
            },
            {
                title: 'Youth Leadership Forum',
                description: 'Empowering young community members to develop leadership skills and take active roles in community development.',
                event_date: '2025-03-05',
                location: 'Youth Center - Meeting Room',
                capacity: 35
            },
            {
                title: 'Health & Wellness Fair',
                description: 'Free health screenings, wellness workshops, and information about local health resources.',
                event_date: '2025-03-10',
                location: 'Health Center - Main Lobby',
                capacity: 50
            },
            {
                title: 'Environmental Action Day',
                description: 'Community cleanup, tree planting, and environmental education activities for all ages.',
                event_date: '2025-03-15',
                location: 'Various locations around the city',
                capacity: 75
            },
            {
                title: 'Creative Entrepreneurship Workshop',
                description: 'Learn how to turn your creative passions into sustainable business opportunities.',
                event_date: '2025-03-20',
                location: 'Business Incubator - Conference Room',
                capacity: 25
            },
            {
                title: 'Intergenerational Storytelling',
                description: 'An evening of sharing stories across generations to preserve community history and build connections.',
                event_date: '2025-03-25',
                location: 'Community Library - Reading Room',
                capacity: 40
            },
            {
                title: 'Community Garden Planting Day',
                description: 'Help us plant and maintain our community garden, learn about sustainable agriculture, and share gardening tips.',
                event_date: '2025-03-30',
                location: 'Community Garden - Main Plot',
                capacity: 30
            }
        ];

        for (const event of sampleEvents) {
            await db.query(
                "INSERT INTO events (title, description, event_date, location, capacity) VALUES (?, ?, ?, ?, ?)",
                [event.title, event.description, event.event_date, event.location, event.capacity]
            );
            console.log(`✅ Created event: ${event.title}`);
        }
        
        console.log('✅ All sample events created successfully');
        
    } catch (error) {
        console.error('❌ Error creating sample events:', error);
        throw error;
    }
}

// Create sample visits for realistic data
async function createSampleVisits() {
    try {
        const [existingVisits] = await db.query("SELECT COUNT(*) as count FROM visits");
        
        if (existingVisits[0].count >= 20) {
            console.log('✅ Sample visits already exist');
            return;
        }

        // Get approved users and events
        const [users] = await db.query("SELECT id FROM users WHERE role = 'member' AND status = 'approved' LIMIT 15");
        const [events] = await db.query("SELECT id FROM events LIMIT 8");
        
        if (users.length === 0 || events.length === 0) {
            console.log('⚠️  No users or events available for creating visits');
            return;
        }

        // Create random visits
        for (let i = 0; i < 30; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            
            // Check if visit already exists
            const [existingVisit] = await db.query(
                "SELECT id FROM visits WHERE user_id = ? AND event_id = ?",
                [randomUser.id, randomEvent.id]
            );
            
            if (existingVisit.length > 0) {
                continue; // Skip if visit already exists
            }
            
            // Random visit date within the last 30 days
            const visitDate = new Date();
            visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * 30));
            
            await db.query(
                "INSERT INTO visits (user_id, event_id, visit_date) VALUES (?, ?, ?)",
                [randomUser.id, randomEvent.id, visitDate.toISOString().split('T')[0]]
            );
        }
        
        console.log('✅ Sample visits created successfully');
        
    } catch (error) {
        console.error('❌ Error creating sample visits:', error);
        throw error;
    }
}

// Run the setup
setupDatabase(); 