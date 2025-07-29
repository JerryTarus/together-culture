// Script to create an admin user
const bcrypt = require('bcryptjs');
const db = require('./config/db');

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
    { full_name: 'Andrew Perez', email: 'andrew.perez@example.com', bio: 'Community health worker and public health advocate', skills: 'Public Health, Community Health, Advocacy' },
    { full_name: 'Olivia Turner', email: 'olivia.turner@example.com', bio: 'Art therapist and creative wellness practitioner', skills: 'Art Therapy, Creative Wellness, Healing Arts' },
    { full_name: 'Brandon Hall', email: 'brandon.hall@example.com', bio: 'Social entrepreneur building inclusive communities', skills: 'Social Entrepreneurship, Community Building, Leadership' },
    { full_name: 'Grace Phillips', email: 'grace.phillips@example.com', bio: 'Environmental educator and nature connection facilitator', skills: 'Environmental Education, Nature Connection, Facilitation' },
    { full_name: 'Jordan Moore', email: 'jordan.moore@example.com', bio: 'Digital artist and creative technologist', skills: 'Digital Art, Creative Technology, Innovation' },
    { full_name: 'Isabella Scott', email: 'isabella.scott@example.com', bio: 'Community nutritionist and food educator', skills: 'Nutrition, Food Education, Community Health' },
    { full_name: 'Ethan Wright', email: 'ethan.wright@example.com', bio: 'Sustainable fashion designer and textile artist', skills: 'Fashion Design, Textile Arts, Sustainability' },
    { full_name: 'Chloe Baker', email: 'chloe.baker@example.com', bio: 'Mindfulness teacher and meditation guide', skills: 'Mindfulness, Meditation, Wellness' },
    { full_name: 'Nathan Cooper', email: 'nathan.cooper@example.com', bio: 'Community organizer and social justice educator', skills: 'Community Organizing, Social Justice, Education' },
    { full_name: 'Zoe Richardson', email: 'zoe.richardson@example.com', bio: 'Circular economy advocate and waste reduction specialist', skills: 'Circular Economy, Waste Reduction, Sustainability' },
    { full_name: 'Lucas Morgan', email: 'lucas.morgan@example.com', bio: 'Urban farmer and local food system advocate', skills: 'Urban Farming, Local Food Systems, Agriculture' },
    { full_name: 'Ava Peterson', email: 'ava.peterson@example.com', bio: 'Creative writing instructor and storytelling facilitator', skills: 'Creative Writing, Storytelling, Facilitation' },
    { full_name: 'Mason Bailey', email: 'mason.bailey@example.com', bio: 'Social impact filmmaker and documentary producer', skills: 'Filmmaking, Documentary, Social Impact' },
    { full_name: 'Lily Reed', email: 'lily.reed@example.com', bio: 'Community psychologist and mental health advocate', skills: 'Psychology, Mental Health, Community Support' },
    { full_name: 'Caleb Ward', email: 'caleb.ward@example.com', bio: 'Sustainable transportation advocate and urban mobility expert', skills: 'Transportation, Urban Mobility, Sustainability' },
    { full_name: 'Scarlett Collins', email: 'scarlett.collins@example.com', bio: 'Cultural heritage preservationist and traditional arts advocate', skills: 'Cultural Heritage, Traditional Arts, Preservation' },
    { full_name: 'Isaac Stewart', email: 'isaac.stewart@example.com', bio: 'Social innovation consultant and impact measurement specialist', skills: 'Social Innovation, Impact Measurement, Consulting' },
    { full_name: 'Violet Morris', email: 'violet.morris@example.com', bio: 'Community resilience builder and disaster preparedness educator', skills: 'Community Resilience, Disaster Preparedness, Education' },
    { full_name: 'Owen Rogers', email: 'owen.rogers@example.com', bio: 'Digital literacy advocate and technology educator', skills: 'Digital Literacy, Technology Education, Digital Inclusion' },
    { full_name: 'Luna Price', email: 'luna.price@example.com', bio: 'Indigenous rights advocate and cultural preservationist', skills: 'Indigenous Rights, Cultural Preservation, Advocacy' },
    { full_name: 'Leo Bennett', email: 'leo.bennett@example.com', bio: 'Social housing advocate and affordable housing specialist', skills: 'Housing Advocacy, Affordable Housing, Community Development' },
    { full_name: 'Stella Wood', email: 'stella.wood@example.com', bio: 'Environmental justice advocate and climate action organizer', skills: 'Environmental Justice, Climate Action, Organizing' },
    { full_name: 'Felix Barnes', email: 'felix.barnes@example.com', bio: 'Youth empowerment specialist and leadership development coach', skills: 'Youth Empowerment, Leadership Development, Coaching' },
    { full_name: 'Ruby Ross', email: 'ruby.ross@example.com', bio: 'Community arts organizer and creative placemaking specialist', skills: 'Community Arts, Creative Placemaking, Arts Administration' },
    { full_name: 'Theo Henderson', email: 'theo.henderson@example.com', bio: 'Social enterprise consultant and impact investment advisor', skills: 'Social Enterprise, Impact Investment, Consulting' },
    { full_name: 'Ivy Coleman', email: 'ivy.coleman@example.com', bio: 'Intergenerational program coordinator and age-friendly community advocate', skills: 'Intergenerational Programs, Age-Friendly Communities, Coordination' },
    { full_name: 'Max Jenkins', email: 'max.jenkins@example.com', bio: 'Digital accessibility advocate and inclusive design specialist', skills: 'Digital Accessibility, Inclusive Design, Advocacy' },
    { full_name: 'Nova Perry', email: 'nova.perry@example.com', bio: 'Community safety advocate and restorative justice practitioner', skills: 'Community Safety, Restorative Justice, Conflict Resolution' },
    { full_name: 'Atlas Long', email: 'atlas.long@example.com', bio: 'Sustainable tourism advocate and cultural heritage specialist', skills: 'Sustainable Tourism, Cultural Heritage, Tourism Development' },
    { full_name: 'Sage Patterson', email: 'sage.patterson@example.com', bio: 'Community health researcher and public health data analyst', skills: 'Public Health Research, Data Analysis, Community Health' },
    { full_name: 'River Hughes', email: 'river.hughes@example.com', bio: 'Environmental educator and climate literacy specialist', skills: 'Environmental Education, Climate Literacy, Education' },
    { full_name: 'Willow Foster', email: 'willow.foster@example.com', bio: 'Social innovation researcher and impact evaluation specialist', skills: 'Social Innovation Research, Impact Evaluation, Research' },
    { full_name: 'Phoenix Butler', email: 'phoenix.butler@example.com', bio: 'Community technology advocate and digital inclusion specialist', skills: 'Community Technology, Digital Inclusion, Technology Access' },
    { full_name: 'Sage Russell', email: 'sage.russell@example.com', bio: 'Indigenous knowledge keeper and traditional wisdom teacher', skills: 'Indigenous Knowledge, Traditional Wisdom, Cultural Teaching' },
    { full_name: 'Ocean Griffin', email: 'ocean.griffin@example.com', bio: 'Marine conservation advocate and ocean literacy educator', skills: 'Marine Conservation, Ocean Literacy, Environmental Education' },
    { full_name: 'Forest Diaz', email: 'forest.diaz@example.com', bio: 'Urban forestry advocate and green infrastructure specialist', skills: 'Urban Forestry, Green Infrastructure, Environmental Planning' },
    { full_name: 'Meadow Cox', email: 'meadow.cox@example.com', bio: 'Community food systems advocate and local agriculture specialist', skills: 'Food Systems, Local Agriculture, Community Development' },
    { full_name: 'River Torres', email: 'river.torres@example.com', bio: 'Water justice advocate and watershed protection specialist', skills: 'Water Justice, Watershed Protection, Environmental Advocacy' },
    { full_name: 'Skye Gray', email: 'skye.gray@example.com', bio: 'Clean energy advocate and renewable technology specialist', skills: 'Clean Energy, Renewable Technology, Energy Advocacy' },
    { full_name: 'Storm Evans', email: 'storm.evans@example.com', bio: 'Climate resilience advocate and adaptation planning specialist', skills: 'Climate Resilience, Adaptation Planning, Climate Action' },
    { full_name: 'Rain Collins', email: 'rain.collins@example.com', bio: 'Community water advocate and water quality specialist', skills: 'Water Advocacy, Water Quality, Community Health' },
    { full_name: 'Sunny Ward', email: 'sunny.ward@example.com', bio: 'Solar energy advocate and renewable power specialist', skills: 'Solar Energy, Renewable Power, Energy Transition' },
    { full_name: 'Breeze Murphy', email: 'breeze.murphy@example.com', bio: 'Wind energy advocate and clean power specialist', skills: 'Wind Energy, Clean Power, Renewable Energy' },
    { full_name: 'Crystal Brooks', email: 'crystal.brooks@example.com', bio: 'Mineral rights advocate and resource protection specialist', skills: 'Mineral Rights, Resource Protection, Environmental Law' },
    { full_name: 'Mountain Kelly', email: 'mountain.kelly@example.com', bio: 'Mountain conservation advocate and alpine ecosystem specialist', skills: 'Mountain Conservation, Alpine Ecosystems, Environmental Protection' },
    { full_name: 'Valley Sanders', email: 'valley.sanders@example.com', bio: 'Valley restoration advocate and watershed management specialist', skills: 'Valley Restoration, Watershed Management, Ecosystem Health' }
];

async function createAdminUser() {
    try {
        // Check if admin already exists
        const [existingAdmin] = await db.query("SELECT id FROM users WHERE email = 'admin@togetherculture.com'");

        if (existingAdmin.length > 0) {
            console.log('✅ Admin user already exists');
            return;
        }

        // Create admin user
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
    }
}

async function createDummyUsers() {
    try {
        // Check if dummy users already exist
        const [existingUsers] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'member'");
        
        if (existingUsers[0].count >= 50) {
            console.log('✅ Dummy users already exist');
            return;
        }

        console.log('🔄 Creating dummy users...');
        
        for (let i = 0; i < dummyUsers.length; i++) {
            const user = dummyUsers[i];
            
            // Create a simple password for each user
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash('password123', salt);
            
            // Randomly assign status (70% approved, 20% pending, 10% rejected)
            const statusOptions = ['approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'pending', 'pending', 'rejected'];
            const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
            
            await db.query(
                "INSERT INTO users (full_name, email, password, role, status, bio, skills, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                [user.full_name, user.email, hashedPassword, 'member', randomStatus, user.bio, user.skills]
            );
            
            console.log(`✅ Created user: ${user.full_name} (${randomStatus})`);
        }
        
        console.log('✅ All dummy users created successfully');
        console.log('🔑 All users have password: password123');
        
    } catch (error) {
        console.error('❌ Error creating dummy users:', error);
    }
}

async function createSampleEvents() {
    try {
        // Check if events already exist
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
    }
}

async function main() {
    try {
        console.log('🚀 Starting Together Culture CRM setup...');
        
        // Test database connection
        await db.testConnection();
        
        // Create admin user
        await createAdminUser();
        
        // Create dummy users
        await createDummyUsers();
        
        // Create sample events
        await createSampleEvents();
        
        console.log('\n🎉 Setup completed successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('👤 Admin: admin@togetherculture.com / admin123');
        console.log('👥 Members: Use any email from the list with password: password123');
        console.log('\n🔗 Access the application at: http://localhost:5000');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
    } finally {
        process.exit(0);
    }
}

main();
