# Together Culture CRM

A comprehensive Customer Relationship Management system designed for community organizations to manage members, events, resources, and communications.

## Features

### Core Functionality
- **User Management**: Admin and member roles with different access levels
- **Event Management**: Create, edit, delete, and attend events with RSVP functionality
- **Messaging System**: Real-time communication between members
- **Resource Sharing**: Upload and manage community resources
- **Member Directory**: Browse and connect with other community members

### User Roles
- **Admin**: Full access to create/edit events, manage users, view reports
- **Member**: Attend events, message other members, access resources

### Key Features
- **Event Attendance**: Members can register/unregister for events
- **Real-time Messaging**: Conversation-based messaging system
- **Dashboard Analytics**: Event attendance, member statistics
- **Responsive Design**: Works on desktop and mobile devices
- **Search & Filtering**: Find events, members, and resources easily

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **bcryptjs** for password hashing
- **express-session** for authentication
- **multer** for file uploads

### Frontend
- **Vanilla JavaScript** (ES6+)
- **Tailwind CSS** for styling
- **Responsive design** principles

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd together-culture-crm
```

2. **Install dependencies**
```bash
npm install
cd backend && npm install
```

3. **Setup Database**
```bash
# Run the database setup script
node backend/setup-database.js

# Create admin user
node backend/create-admin.js
```

4. **Environment Configuration**
```bash
# Create environment file
node backend/create-env.js
```

5. **Start the application**
```bash
# From the root directory
npm start
# Or manually:
cd backend && npm start
```

## Database Schema

### Core Tables
- **users**: Member and admin accounts
- **events**: Community events with capacity management
- **visits**: Event attendance tracking (RSVP system)
- **conversations**: One-on-one messaging threads
- **messages**: Individual messages within conversations
- **resources**: Shared files and documents

### Key Relationships
- Users can attend multiple events (many-to-many via visits)
- Users can have multiple conversations (many-to-many via conversations)
- Events track attendance count and capacity limits

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Events
- `GET /api/events` - List events with filtering and pagination
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (admin only)
- `PUT /api/events/:id` - Update event (admin only)
- `DELETE /api/events/:id` - Delete event (admin only)
- `POST /api/events/:id/register` - Register for event (RSVP)
- `DELETE /api/events/:id/register` - Unregister from event

### Messages
- `GET /api/messages/conversations` - Get user conversations
- `GET /api/messages/:conversationId` - Get conversation messages
- `POST /api/messages` - Send message

### Users
- `GET /api/users` - List all users (for messaging)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/profile` - Update user profile

## Usage Guide

### For Admins
1. **Create Events**: Use the admin dashboard to create community events
2. **Manage Members**: View member statistics and manage user accounts
3. **Monitor Attendance**: Track event registration and attendance
4. **View Reports**: Access comprehensive analytics

### For Members
1. **Browse Events**: View upcoming and past events
2. **RSVP for Events**: Register to attend events you're interested in
3. **Message Members**: Connect with other community members
4. **Access Resources**: Download shared community resources
5. **Update Profile**: Keep your profile information current

## Event Management Features

### Event Creation (Admin)
- Set event title, description, date, time, location
- Define maximum capacity
- Track registrations in real-time

### Event Attendance (Members)
- View event details in modal
- Register/unregister for attendance
- See current attendance count
- View list of registered attendees

### Event Display
- List view with filtering and search
- Calendar view for visual planning
- Sort by date (newest first), title, or capacity
- Pagination for large event lists

## Messaging System

### Features
- **Real-time Conversations**: Direct messaging between members
- **Member Directory**: Find and message any community member
- **Conversation Management**: Organized conversation threads
- **Message Status**: Track read/unread messages

### How to Use
1. Navigate to Messages page
2. Select a member from the directory
3. Start a conversation
4. Messages are saved and retrievable

## Deployment

### Local Development
```bash
cd backend && npm start
# Server runs on http://localhost:5000
```

### Production Deployment (Replit)
1. **Configure Environment**: Ensure all environment variables are set
2. **Database Setup**: Run setup scripts in production environment
3. **Port Configuration**: Application uses port 5000 (configured for Replit)
4. **Static Files**: Frontend served from backend/public

## Security Features

- **Session-based Authentication**: Secure login system
- **Role-based Access Control**: Admin vs member permissions
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: HTML escaping for user content

## File Structure

```
together-culture-crm/
├── backend/
│   ├── config/db.js          # Database configuration
│   ├── middleware/           # Authentication middleware
│   ├── routes/              # API route handlers
│   ├── migrations/          # Database schema files
│   └── server.js           # Main server file
├── frontend/
│   ├── js/                 # Client-side JavaScript
│   ├── css/               # Stylesheets
│   └── *.html            # HTML pages
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request

## Support

For issues or questions:
1. Check the console for error messages
2. Verify database connection
3. Ensure all dependencies are installed
4. Check that all required environment variables are set

## License

This project is licensed under the MIT License.