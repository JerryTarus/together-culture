
# 🌟 Together Culture - Community Management Platform

A comprehensive community management platform built with Node.js/Express backend and vanilla JavaScript frontend, designed to foster connections and manage community activities.

## 🚀 Features

### 🌐 Modern Architecture
- **MySQL-only backend**: Fully reverted to MySQL, no PostgreSQL dependencies or logic
- **Cookie/session-based authentication**: Secure, robust session management for all flows
- **Defensive coding & error handling**: Prevents crashes and infinite loops
- **Modern, responsive UI**: Personalized dashboards for admins and members


### 👥 User Management
- **User Registration & Authentication**: Secure signup/login with JWT tokens
- **Role-Based Access Control**: Admin and Member roles with different permissions
- **User Approval Workflow**: Admin approval required for new member accounts
- **Profile Management**: Users can manage their personal information

### 📊 Admin Dashboard
- **Comprehensive Analytics**: Member statistics, event metrics, and activity tracking
- **User Management**: Approve/reject pending users, manage member status
- **Real-time Statistics**: Dashboard with live data updates
- **Activity Monitoring**: Track recent user activities and system events

### 👤 Member Dashboard
- **Personal Overview**: View account status, recent activities, and real-time community stats
- **Events Attended**: See and update RSVP status, always up-to-date
- **Community Members**: Real-time member count
- **Resource Upload**: Members can upload files; uploads are marked pending until admin approval
- **Quick Actions**: Easy navigation to messages, events, and resources
- **Modern, visually appealing design**: Personalized for each member

- **Personal Overview**: View account status and recent activities
- **Quick Navigation**: Easy access to all platform features
- **Status Tracking**: See approval status and account information

### 💬 Messaging System
- **Direct Messages**: Private conversations between members
- **Real-time Communication**: Instant message delivery and notifications
- **Member Directory**: Browse and start conversations with approved members
- **Message History**: Persistent conversation threads

### 📚 Resource Library
- **File Upload/Download**: Share documents, images, and other resources
- **Member Uploads with Approval**: Member uploads are marked as 'pending' and require admin approval before being visible to others
- **Status Badges**: Members see the status (pending/approved/rejected) of their own uploads
- **Categorization**: Organize resources by type and category
- **Search & Filter**: Find resources quickly with advanced filtering
- **Access Control**: Admin-controlled resource visibility

### 📅 Events Management
- **Event Creation**: Admins create and manage events
- **RSVP System**: Members can RSVP or cancel RSVP for events, and see their status on the dashboard
- **Event Calendar**: View upcoming and past events
- **Capacity Management**: Set and track event attendance limits
- **Role-based Access**: Members cannot edit or delete events, only RSVP/cancel

## 🛠️ Technology Stack

### Backend
- **Node.js** with **Express.js** framework
- **MySQL** database with connection pooling
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **CORS** enabled for cross-origin requests

### Frontend
- **Vanilla JavaScript** (ES6+)
- **HTML5** with semantic markup
- **CSS3** with Flexbox/Grid layouts
- **Responsive Design** for mobile compatibility

### Security Features
- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: HTML escaping and validation
- **CORS Configuration**: Controlled cross-origin access

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **MySQL** (v8.0 or higher)
- **npm** package manager

## ⚡ Quick Start

### 📝 Member & Admin Workflows
- **Admins**: Full dashboard, user approval, event/resource management, messaging
- **Members**: Dashboard with real-time stats, RSVP to events, upload resources (pending approval), search and message other members


### 1. Clone and Setup
```bash
git clone <repository-url>
cd together-culture
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Database Setup
> **Note:** The backend is MySQL-only. Ensure your MySQL server is running and accessible. No PostgreSQL support.

```bash
# Create database and tables
node setup-database.js

# Create admin user
node create-admin.js
```

### 4. Start Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 5. Access Application
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api

### 🛡️ Session & Cookie Troubleshooting
- If login succeeds but you are redirected to login repeatedly, clear cookies and ensure your browser allows third-party cookies.
- Only 'approved' members can access member dashboard and features. If you are stuck in a loop, ask an admin to approve your account in the dashboard.
- Admins do not require approval, but must have the correct role in the database.

## 🔑 Default Admin Account

- **Email**: `admin@togetherculture.com`
- **Password**: `admin123`

## 📁 Project Structure

```
together-culture/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database configuration
│   ├── middleware/
│   │   └── authMiddleware.js     # Authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User management routes
│   │   ├── admin.js             # Admin-specific routes
│   │   ├── messages.js          # Messaging system routes
│   │   ├── resources.js         # File/resource management
│   │   └── events.js            # Event management routes
│   ├── migrations/              # Database schema migrations
│   ├── uploads/                 # File upload storage
│   ├── server.js               # Main server file
│   └── package.json            # Backend dependencies
├── frontend/
│   ├── css/
│   │   └── style.css           # Main stylesheet
│   ├── js/
│   │   ├── config.js           # Frontend configuration
│   │   ├── auth.js             # Authentication logic
│   │   ├── admin.js            # Admin dashboard
│   │   ├── member.js           # Member dashboard
│   │   ├── messages.js         # Messaging interface
│   │   ├── resources.js        # Resource management
│   │   └── events.js           # Event interface
│   ├── *.html                  # Page templates
│   └── favicon.ico             # Site icon
└── README.md                   # This file
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### User Management
- `GET /api/users` - List all users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/:id/approve` - Approve user (admin)
- `PATCH /api/users/:id/reject` - Reject user (admin)

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/recent-activity` - Recent activity feed

### Messages
- `GET /api/messages/conversations` - Get user conversations
- `GET /api/messages/conversation/:id` - Get conversation messages
- `POST /api/messages` - Send message
- `GET /api/users` - Get users for messaging

### Resources
- `GET /api/resources` - List resources with filtering
- `POST /api/resources` - Upload new resource (members: status will be pending)
- `GET /api/resources/:id/download` - Download resource
- `DELETE /api/resources/:id` - Delete resource (admin)
- **Workflow:** Member uploads are visible only to the uploader and admins until approved. Admins can approve/reject uploads in the dashboard.

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (admin)
- `PUT /api/events/:id` - Update event (admin)
- `POST /api/events/:id/rsvp` - RSVP to event

## 🗄️ Database Schema

> **Best Practice:** Always use parameterized queries and never expose secrets in your code or repository. All user passwords are hashed and JWT secrets must be kept safe in your .env file.


### Core Tables
- **users**: User accounts and profiles
- **events**: Community events
- **event_rsvps**: Event registration tracking  
- **messages**: User communications
- **conversations**: Message threading
- **resources**: File and document library

### Key Relationships
- Users have roles (admin/member) and status (pending/approved/rejected)
- Events have RSVPs from users with capacity limits
- Messages belong to conversations between users
- Resources are uploaded by users with access controls

## 🔒 Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens for stateless authentication
- SQL injection prevention through parameterized queries
- XSS protection via HTML escaping
- File upload restrictions and validation
- CORS properly configured
- Admin-only routes protected

## 🌐 Browser Support

- Chrome (recommended)
- Firefox 
- Safari
- Edge

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check MySQL is running
sudo service mysql start

# Verify database exists
mysql -u root -p
CREATE DATABASE together_culture;
```

**Login Redirects to Login Page**
- Clear browser cookies and localStorage
- Check user status (must be approved)
- Verify JWT_SECRET in .env file

**File Upload Issues**
- Check upload directory permissions
- Verify file size limits (10MB default)
- Ensure supported file types

### Debug Commands
```bash
# View detailed logs
cd backend && npm run dev

# Test database connection
node -e "require('./config/db').query('SELECT 1')"

# Reset database
node setup-database.js --reset
```

## 🚀 Deployment & Hosting

- For local development, use Node.js and MySQL as above.
- For cloud deployment (Heroku, DigitalOcean, Replit, etc):
  - Set all environment variables in your cloud environment
  - Ensure MySQL is accessible from your deployment
  - Use secure HTTPS for production
  - Always set a strong JWT_SECRET and DB_PASSWORD

### 🚀 Deployment on Replit

1. **Import Project**: Fork this repository to Replit
2. **Set Environment Variables**: Configure in Replit Secrets:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=together_culture
   JWT_SECRET=your_jwt_secret
   ```
3. **Database Setup**: Run database initialization
4. **Start Application**: Use the Run button

## 📞 Support

For technical support or feature requests:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
5. Follow coding standards and include tests

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏗️ Future Enhancements
- Real-time notifications (WebSocket support)
- Mobile app (React Native or Flutter)
- Advanced analytics and reporting
- Integration with external calendar and communication tools
- Multi-language support
- Granular user permissions
- Email and push notification system
- Social media and API integrations


- Real-time notifications
- Mobile app development
- Advanced reporting dashboard
- Integration with external calendar systems
- Multi-language support
- Advanced user permissions
- Email notification system
- Social media integration

---

**Built with ❤️ for community management**
