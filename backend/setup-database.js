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
        
        // 7. Create sample resources
        console.log('📁 Creating sample resources...');
        await createSampleResources();
        
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
        // Create users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'member') DEFAULT 'member',
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                bio TEXT,
                skills TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create events table
        await db.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                location VARCHAR(255) NOT NULL,
                capacity INT NOT NULL DEFAULT 50,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
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

        // Create resources table
        await db.query(`
            CREATE TABLE IF NOT EXISTS resources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) DEFAULT 'general',
                tags TEXT,
                access_level ENUM('all', 'members', 'admin') DEFAULT 'all',
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_size INT NOT NULL,
                file_type VARCHAR(10) NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                downloads INT DEFAULT 0,
                uploaded_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_category (category),
                INDEX idx_file_type (file_type),
                INDEX idx_access_level (access_level),
                INDEX idx_created_at (created_at)
            )
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
    console.log('🔄 Running database migrations...');
    
    try {
        // Check and add status column to users table if it doesn't exist
        const [userColumns] = await db.query("SHOW COLUMNS FROM users LIKE 'status'");
        if (userColumns.length === 0) {
            await db.query("ALTER TABLE users ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
            console.log('✅ Added status column to users table');
        }
        
        // Check and add last_login column to users table if it doesn't exist
        const [lastLoginColumns] = await db.query("SHOW COLUMNS FROM users LIKE 'last_login'");
        if (lastLoginColumns.length === 0) {
            await db.query("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL");
            console.log('✅ Added last_login column to users table');
        }
        
        // Check and add updated_at column to users table if it doesn't exist
        const [updatedAtColumns] = await db.query("SHOW COLUMNS FROM users LIKE 'updated_at'");
        if (updatedAtColumns.length === 0) {
            await db.query("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            console.log('✅ Added updated_at column to users table');
        }
        
        // Check and add capacity column to events table if it doesn't exist
        const [eventColumns] = await db.query("SHOW COLUMNS FROM events LIKE 'capacity'");
        if (eventColumns.length === 0) {
            await db.query("ALTER TABLE events ADD COLUMN capacity INT DEFAULT 50");
            console.log('✅ Added capacity column to events table');
        }
        
        // Check if events table has old structure and migrate it
        const [eventDateColumn] = await db.query("SHOW COLUMNS FROM events LIKE 'event_date'");
        if (eventDateColumn.length > 0) {
            console.log('🔄 Migrating events table structure...');
            
            // Add new columns
            await db.query("ALTER TABLE events ADD COLUMN date DATE AFTER description");
            await db.query("ALTER TABLE events ADD COLUMN time TIME AFTER date");
            await db.query("ALTER TABLE events ADD COLUMN created_by INT AFTER capacity");
            await db.query("ALTER TABLE events ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER created_by");
            await db.query("ALTER TABLE events ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
            
            // Migrate data from event_date to date and set default time
            await db.query("UPDATE events SET date = event_date, time = '10:00:00' WHERE date IS NULL");
            
            // Drop old column
            await db.query("ALTER TABLE events DROP COLUMN event_date");
            
            // Add foreign key constraint
            await db.query("ALTER TABLE events ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL");
            
            console.log('✅ Events table migration completed');
        }
        
        // Ensure NOT NULL constraints and proper data types
        const [eventTableInfo] = await db.query("DESCRIBE events");
        const columnMap = {};
        eventTableInfo.forEach(col => {
            columnMap[col.Field] = col;
        });
        
        // Update column constraints if needed
        if (columnMap.title && columnMap.title.Null === 'YES') {
            await db.query("ALTER TABLE events MODIFY COLUMN title VARCHAR(255) NOT NULL");
        }
        if (columnMap.description && columnMap.description.Null === 'YES') {
            await db.query("ALTER TABLE events MODIFY COLUMN description TEXT NOT NULL");
        }
        if (columnMap.date && columnMap.date.Null === 'YES') {
            await db.query("ALTER TABLE events MODIFY COLUMN date DATE NOT NULL");
        }
        if (columnMap.time && columnMap.time.Null === 'YES') {
            await db.query("ALTER TABLE events MODIFY COLUMN time TIME NOT NULL");
        }
        if (columnMap.location && columnMap.location.Null === 'YES') {
            await db.query("ALTER TABLE events MODIFY COLUMN location VARCHAR(255) NOT NULL");
        }
        if (columnMap.capacity && columnMap.capacity.Default === null) {
            await db.query("ALTER TABLE events MODIFY COLUMN capacity INT NOT NULL DEFAULT 50");
        }
        
        // Check if resources table has old structure and migrate it
        const [resourcesColumns] = await db.query("SHOW COLUMNS FROM resources");
        const resourcesColumnMap = {};
        resourcesColumns.forEach(col => {
            resourcesColumnMap[col.Field] = col;
        });
        
        // Add missing columns to resources table
        if (!resourcesColumnMap.description) {
            await db.query("ALTER TABLE resources ADD COLUMN description TEXT AFTER title");
            console.log('✅ Added description column to resources table');
        }
        if (!resourcesColumnMap.category) {
            await db.query("ALTER TABLE resources ADD COLUMN category VARCHAR(100) DEFAULT 'general' AFTER description");
            console.log('✅ Added category column to resources table');
        }
        if (!resourcesColumnMap.tags) {
            await db.query("ALTER TABLE resources ADD COLUMN tags TEXT AFTER category");
            console.log('✅ Added tags column to resources table');
        }
        if (!resourcesColumnMap.access_level) {
            await db.query("ALTER TABLE resources ADD COLUMN access_level ENUM('all', 'members', 'admin') DEFAULT 'all' AFTER tags");
            console.log('✅ Added access_level column to resources table');
        }
        if (!resourcesColumnMap.file_name) {
            await db.query("ALTER TABLE resources ADD COLUMN file_name VARCHAR(255) NOT NULL DEFAULT '' AFTER access_level");
            console.log('✅ Added file_name column to resources table');
        }
        if (!resourcesColumnMap.file_path) {
            await db.query("ALTER TABLE resources ADD COLUMN file_path VARCHAR(255) NOT NULL DEFAULT '' AFTER file_name");
            console.log('✅ Added file_path column to resources table');
        }
        if (!resourcesColumnMap.file_size) {
            await db.query("ALTER TABLE resources ADD COLUMN file_size INT NOT NULL DEFAULT 0 AFTER file_path");
            console.log('✅ Added file_size column to resources table');
        }
        if (!resourcesColumnMap.file_type) {
            await db.query("ALTER TABLE resources ADD COLUMN file_type VARCHAR(10) NOT NULL DEFAULT '' AFTER file_size");
            console.log('✅ Added file_type column to resources table');
        }
        if (!resourcesColumnMap.mime_type) {
            await db.query("ALTER TABLE resources ADD COLUMN mime_type VARCHAR(100) NOT NULL DEFAULT '' AFTER file_type");
            console.log('✅ Added mime_type column to resources table');
        }
        if (!resourcesColumnMap.downloads) {
            await db.query("ALTER TABLE resources ADD COLUMN downloads INT DEFAULT 0 AFTER mime_type");
            console.log('✅ Added downloads column to resources table');
        }
        if (!resourcesColumnMap.created_at) {
            await db.query("ALTER TABLE resources ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER uploaded_by");
            console.log('✅ Added created_at column to resources table');
        }
        if (!resourcesColumnMap.updated_at) {
            await db.query("ALTER TABLE resources ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
            console.log('✅ Added updated_at column to resources table');
        }
        
        // Remove old columns if they exist
        if (resourcesColumnMap.file_url) {
            await db.query("ALTER TABLE resources DROP COLUMN file_url");
            console.log('✅ Removed old file_url column from resources table');
        }
        if (resourcesColumnMap.original_name) {
            await db.query("ALTER TABLE resources DROP COLUMN original_name");
            console.log('✅ Removed old original_name column from resources table');
        }
        if (resourcesColumnMap.uploaded_at && !resourcesColumnMap.created_at) {
            await db.query("ALTER TABLE resources CHANGE uploaded_at created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            console.log('✅ Renamed uploaded_at to created_at in resources table');
        }
        
        // Add indexes for better performance
        try {
            await db.query("CREATE INDEX IF NOT EXISTS idx_category ON resources (category)");
            await db.query("CREATE INDEX IF NOT EXISTS idx_file_type ON resources (file_type)");
            await db.query("CREATE INDEX IF NOT EXISTS idx_access_level ON resources (access_level)");
            await db.query("CREATE INDEX IF NOT EXISTS idx_created_at ON resources (created_at)");
            console.log('✅ Added indexes to resources table');
        } catch (indexError) {
            console.log('ℹ️ Indexes may already exist');
        }
        
        // Check and add user preference columns
        const [userPreferenceColumns] = await db.query("SHOW COLUMNS FROM users");
        const userPrefColumnMap = {};
        userPreferenceColumns.forEach(col => {
            userPrefColumnMap[col.Field] = col;
        });
        
        // Add missing user preference columns
        if (!userPrefColumnMap.avatar_url) {
            await db.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER skills");
            console.log('✅ Added avatar_url column to users table');
        }
        if (!userPrefColumnMap.email_notifications) {
            await db.query("ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE AFTER avatar_url");
            console.log('✅ Added email_notifications column to users table');
        }
        if (!userPrefColumnMap.push_notifications) {
            await db.query("ALTER TABLE users ADD COLUMN push_notifications BOOLEAN DEFAULT TRUE AFTER email_notifications");
            console.log('✅ Added push_notifications column to users table');
        }
        if (!userPrefColumnMap.privacy_level) {
            await db.query("ALTER TABLE users ADD COLUMN privacy_level ENUM('public', 'members', 'private') DEFAULT 'public' AFTER push_notifications");
            console.log('✅ Added privacy_level column to users table');
        }
        
    } catch (error) {
        console.log('ℹ️ Migration note:', error.message);
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

// Create dummy users (50+ users)
async function createDummyUsers() {
    console.log('👥 Creating dummy users...');
    
    // Check if dummy users already exist
    const [existingUsers] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'member'");
    if (existingUsers[0].count >= 50) {
        console.log('✅ Dummy users already exist');
        return;
    }
    
    // Delete existing dummy users to recreate with 50+
    await db.query("DELETE FROM users WHERE role = 'member'");
    
    const firstNames = [
        'Sarah', 'Michael', 'Emma', 'David', 'Jessica', 'Christopher', 'Ashley', 'Matthew', 'Amanda', 'Joshua',
        'Jennifer', 'Daniel', 'Michelle', 'Andrew', 'Kimberly', 'Joseph', 'Lisa', 'Brian', 'Nancy', 'Kevin',
        'Karen', 'Thomas', 'Betty', 'Timothy', 'Helen', 'Steven', 'Sandra', 'Paul', 'Donna', 'Kenneth',
        'Carol', 'Anthony', 'Ruth', 'Mark', 'Sharon', 'Donald', 'Susan', 'George', 'Laura', 'Edward',
        'Emily', 'Jason', 'Deborah', 'Jeffrey', 'Rachel', 'Ryan', 'Carolyn', 'Jacob', 'Janet', 'Gary',
        'Catherine', 'Nicholas', 'Maria', 'Eric', 'Heather', 'Jonathan', 'Diane', 'Stephen', 'Julie', 'Larry'
    ];
    
    const lastNames = [
        'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez',
        'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
        'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
        'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
        'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez',
        'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart'
    ];
    
    const skills = [
        'JavaScript, React, Node.js', 'Python, Django, Data Analysis', 'Java, Spring Boot, Microservices',
        'C#, .NET, SQL Server', 'PHP, Laravel, MySQL', 'Ruby, Rails, PostgreSQL',
        'Marketing, SEO, Content Creation', 'Project Management, Agile, Scrum', 'Graphic Design, Adobe Creative Suite',
        'UI/UX Design, Figma, Prototyping', 'Sales, CRM, Lead Generation', 'Finance, Accounting, Excel',
        'HR, Recruitment, Employee Relations', 'Business Analysis, Process Improvement', 'Writing, Editing, Copywriting',
        'Photography, Video Editing', 'Event Planning, Coordination', 'Customer Service, Support',
        'Data Science, Machine Learning, Python', 'DevOps, AWS, Docker, Kubernetes',
        'Mobile Development, React Native, Flutter', 'Cybersecurity, Penetration Testing',
        'Digital Marketing, Social Media', 'Teaching, Training, Curriculum Development',
        'Legal, Compliance, Contract Management', 'Healthcare, Medical, Patient Care',
        'Architecture, AutoCAD, 3D Modeling', 'Engineering, Problem Solving, Technical Analysis',
        'Research, Analysis, Documentation', 'Translation, Language, Communication'
    ];
    
    const companies = [
        'Tech Solutions Inc', 'Creative Agency Ltd', 'Digital Marketing Pro', 'Startup Innovations',
        'Consulting Group', 'Design Studio', 'Software Development Co', 'E-commerce Solutions',
        'Data Analytics Firm', 'Mobile App Company', 'Web Development Agency', 'Freelancer',
        'Marketing Consultancy', 'IT Services', 'Healthcare Technology', 'Financial Services',
        'Education Technology', 'Real Estate Tech', 'Media Production', 'Non-Profit Organization',
        'Government Agency', 'Research Institute', 'Manufacturing', 'Retail Technology',
        'Transportation Tech', 'Energy Solutions', 'Environmental Services', 'Food Technology',
        'Sports Technology', 'Entertainment Industry'
    ];
    
    const bioTemplates = [
        "Passionate {profession} with {years} years of experience in {industry}. I love {hobby} and am always looking to {goal}.",
        "Experienced {profession} specializing in {specialization}. In my free time, I enjoy {hobby} and {hobby2}.",
        "{profession} with a background in {industry}. I'm passionate about {passion} and {goal}.",
        "Creative {profession} with expertise in {specialization}. When not working, you'll find me {hobby}.",
        "Dedicated {profession} focused on {goal}. I have {years} years of experience and love {hobby}.",
        "Innovative {profession} working in {industry}. I'm interested in {passion} and {goal}.",
        "Results-driven {profession} with strong {specialization} skills. I enjoy {hobby} and {hobby2}.",
        "Dynamic {profession} committed to {goal}. I have experience in {industry} and love {hobby}."
    ];
    
    const professions = [
        'Software Developer', 'Marketing Manager', 'Graphic Designer', 'Project Manager', 'Data Analyst',
        'Product Manager', 'UX Designer', 'Sales Representative', 'Content Creator', 'Business Analyst',
        'Digital Marketer', 'Web Developer', 'Consultant', 'Customer Success Manager', 'HR Specialist',
        'Financial Analyst', 'Operations Manager', 'Research Scientist', 'Teacher', 'Entrepreneur'
    ];
    
    const industries = [
        'technology', 'healthcare', 'finance', 'education', 'retail', 'manufacturing', 'consulting',
        'media', 'non-profit', 'government', 'real estate', 'transportation', 'energy', 'entertainment'
    ];
    
    const hobbies = [
        'reading', 'hiking', 'photography', 'cooking', 'traveling', 'painting', 'music', 'gardening',
        'fitness', 'yoga', 'cycling', 'swimming', 'running', 'dancing', 'writing', 'volunteering',
        'gaming', 'crafting', 'learning new languages', 'playing instruments', 'sports', 'meditation'
    ];
    
    const goals = [
        'solve complex problems', 'help businesses grow', 'create meaningful connections',
        'build innovative solutions', 'make a positive impact', 'learn new technologies',
        'mentor others', 'drive digital transformation', 'improve user experiences',
        'contribute to community projects', 'advance my career', 'start my own business'
    ];
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create 55 dummy users
    for (let i = 0; i < 55; i++) {
        const firstName = firstNames[i % firstNames.length];
        const lastName = lastNames[i % lastNames.length];
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 0 ? i : ''}@example.com`;
        const fullName = `${firstName} ${lastName}`;
        
        // Randomly assign status (80% approved, 15% pending, 5% rejected)
        let status;
        const rand = Math.random();
        if (rand < 0.8) {
            status = 'approved';
        } else if (rand < 0.95) {
            status = 'pending';
        } else {
            status = 'rejected';
        }
        
        // Generate bio
        const template = bioTemplates[i % bioTemplates.length];
        const profession = professions[i % professions.length];
        const industry = industries[i % industries.length];
        const hobby = hobbies[i % hobbies.length];
        const hobby2 = hobbies[(i + 1) % hobbies.length];
        const goal = goals[i % goals.length];
        const years = Math.floor(Math.random() * 15) + 1;
        const specialization = skills[i % skills.length].split(',')[0];
        const passion = hobbies[(i + 2) % hobbies.length];
        
        const bio = template
            .replace(/{profession}/g, profession)
            .replace(/{years}/g, years)
            .replace(/{industry}/g, industry)
            .replace(/{hobby}/g, hobby)
            .replace(/{hobby2}/g, hobby2)
            .replace(/{goal}/g, goal)
            .replace(/{specialization}/g, specialization)
            .replace(/{passion}/g, passion);
        
        const userSkills = skills[i % skills.length];
        
        await db.query(
            "INSERT INTO users (full_name, email, password, role, status, bio, skills, created_at) VALUES (?, ?, ?, 'member', ?, ?, ?, ?)",
            [fullName, email, hashedPassword, status, bio, userSkills, new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)]
        );
        
        console.log(`✅ Created user: ${fullName} (${email}) - Status: ${status}`);
    }
    
    console.log(`✅ Created 55 dummy users with varied statuses and complete profiles`);
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
                date: '2025-02-15',
                time: '10:00:00',
                location: 'Community Center - Main Hall',
                capacity: 25
            },
            {
                title: 'Sustainable Living Seminar',
                description: 'Learn practical tips for reducing your environmental footprint and living more sustainably in our urban environment.',
                date: '2025-02-20',
                time: '14:00:00',
                location: 'Green Space - Conference Room',
                capacity: 30
            },
            {
                title: 'Digital Skills Workshop',
                description: 'Free workshop for community members to learn essential digital skills for the modern workplace.',
                date: '2025-02-25',
                time: '09:30:00',
                location: 'Tech Hub - Computer Lab',
                capacity: 20
            },
            {
                title: 'Cultural Heritage Celebration',
                description: 'A day to celebrate and share the diverse cultural traditions that make our community unique.',
                date: '2025-03-01',
                time: '10:00:00',
                location: 'Community Park - Amphitheater',
                capacity: 100
            },
            {
                title: 'Youth Leadership Forum',
                description: 'Empowering young community members to develop leadership skills and take active roles in community development.',
                date: '2025-03-05',
                time: '11:00:00',
                location: 'Youth Center - Meeting Room',
                capacity: 35
            },
            {
                title: 'Health & Wellness Fair',
                description: 'Free health screenings, wellness workshops, and information about local health resources.',
                date: '2025-03-10',
                time: '10:00:00',
                location: 'Health Center - Main Lobby',
                capacity: 50
            },
            {
                title: 'Environmental Action Day',
                description: 'Community cleanup, tree planting, and environmental education activities for all ages.',
                date: '2025-03-15',
                time: '09:00:00',
                location: 'Various locations around the city',
                capacity: 75
            },
            {
                title: 'Creative Entrepreneurship Workshop',
                description: 'Learn how to turn your creative passions into sustainable business opportunities.',
                date: '2025-03-20',
                time: '14:00:00',
                location: 'Business Incubator - Conference Room',
                capacity: 25
            },
            {
                title: 'Intergenerational Storytelling',
                description: 'An evening of sharing stories across generations to preserve community history and build connections.',
                date: '2025-03-25',
                time: '18:00:00',
                location: 'Community Library - Reading Room',
                capacity: 40
            },
            {
                title: 'Community Garden Planting Day',
                description: 'Help us plant and maintain our community garden, learn about sustainable agriculture, and share gardening tips.',
                date: '2025-03-30',
                time: '10:00:00',
                location: 'Community Garden - Main Plot',
                capacity: 30
            }
        ];

        for (const event of sampleEvents) {
            await db.query(
                "INSERT INTO events (title, description, date, time, location, capacity) VALUES (?, ?, ?, ?, ?, ?)",
                [event.title, event.description, event.date, event.time, event.location, event.capacity]
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

// Create sample resources
async function createSampleResources() {
    console.log('📁 Creating sample resources...');
    
    // Check if resources already exist
    const [existingResources] = await db.query('SELECT COUNT(*) as count FROM resources');
    if (existingResources[0].count > 0) {
        console.log('✅ Sample resources already exist');
        return;
    }
    
    const sampleResources = [
        {
            title: 'Community Guidelines Handbook',
            description: 'Comprehensive guide covering community standards, behavior expectations, and participation guidelines for all members.',
            category: 'documentation',
            tags: 'guidelines, community, handbook, rules',
            access_level: 'all',
            file_name: 'community-guidelines.pdf',
            file_path: 'sample-community-guidelines.pdf',
            file_size: 2457600, // 2.4MB
            file_type: 'pdf',
            mime_type: 'application/pdf'
        },
        {
            title: 'Event Planning Template',
            description: 'Customizable template for planning community events, including budget tracking, timeline, and resource allocation.',
            category: 'templates',
            tags: 'events, planning, template, organization',
            access_level: 'members',
            file_name: 'event-planning-template.xlsx',
            file_path: 'sample-event-template.xlsx',
            file_size: 1024000, // 1MB
            file_type: 'xlsx',
            mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        {
            title: 'Annual Report 2024',
            description: 'Complete annual report showcasing community achievements, financial summary, and goals for the upcoming year.',
            category: 'reports',
            tags: 'annual, report, achievements, finances',
            access_level: 'admin',
            file_name: 'annual-report-2024.pdf',
            file_path: 'sample-annual-report.pdf',
            file_size: 5242880, // 5MB
            file_type: 'pdf',
            mime_type: 'application/pdf'
        },
        {
            title: 'Member Onboarding Presentation',
            description: 'Welcome presentation for new members covering community history, values, available resources, and how to get involved.',
            category: 'presentations',
            tags: 'onboarding, welcome, introduction, new members',
            access_level: 'all',
            file_name: 'member-onboarding.pptx',
            file_path: 'sample-onboarding.pptx',
            file_size: 3145728, // 3MB
            file_type: 'pptx',
            mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        },
        {
            title: 'Community Logo Pack',
            description: 'Official community logos in various formats and sizes for use in presentations, documents, and promotional materials.',
            category: 'graphics',
            tags: 'logo, branding, graphics, official',
            access_level: 'members',
            file_name: 'logo-pack.zip',
            file_path: 'sample-logo-pack.zip',
            file_size: 2097152, // 2MB
            file_type: 'zip',
            mime_type: 'application/zip'
        },
        {
            title: 'Monthly Newsletter Template',
            description: 'Editable newsletter template for monthly community updates, featuring sections for events, highlights, and announcements.',
            category: 'templates',
            tags: 'newsletter, template, communication, monthly',
            access_level: 'admin',
            file_name: 'newsletter-template.docx',
            file_path: 'sample-newsletter.docx',
            file_size: 1572864, // 1.5MB
            file_type: 'docx',
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        },
        {
            title: 'Community Photo Gallery',
            description: 'Collection of high-quality photos from recent community events and activities for use in promotional materials.',
            category: 'graphics',
            tags: 'photos, gallery, events, community',
            access_level: 'all',
            file_name: 'photo-gallery.zip',
            file_path: 'sample-photos.zip',
            file_size: 8388608, // 8MB
            file_type: 'zip',
            mime_type: 'application/zip'
        },
        {
            title: 'Budget Planning Spreadsheet',
            description: 'Comprehensive budget planning tool with formulas for tracking income, expenses, and financial projections.',
            category: 'finance',
            tags: 'budget, finance, planning, spreadsheet',
            access_level: 'admin',
            file_name: 'budget-planner.xlsx',
            file_path: 'sample-budget.xlsx',
            file_size: 819200, // 800KB
            file_type: 'xlsx',
            mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
    ];
    
    // Get admin user ID for sample resources
    const [adminUser] = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminId = adminUser.length > 0 ? adminUser[0].id : null;
    
    for (const resource of sampleResources) {
        await db.query(`
            INSERT INTO resources (
                title, description, category, tags, access_level,
                file_name, file_path, file_size, file_type, mime_type,
                uploaded_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            resource.title,
            resource.description,
            resource.category,
            resource.tags,
            resource.access_level,
            resource.file_name,
            resource.file_path,
            resource.file_size,
            resource.file_type,
            resource.mime_type,
            adminId
        ]);
        console.log(`✅ Created resource: ${resource.title}`);
    }
}

// Run the setup
setupDatabase(); 