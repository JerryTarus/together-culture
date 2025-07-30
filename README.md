# Together Culture CRM Application

A comprehensive Customer Relationship Management (CRM) system built for community organizations to manage members, events, resources, and communications.

## 🚀 Features

### ✅ **Core Functionality**
- **User Authentication & Authorization** - Secure login/registration with role-based access control
- **Member Management** - Admin approval workflow with user status tracking (pending/approved/rejected)
- **Events Management** - Full CRUD operations with registration, capacity limits, and calendar integration
- **Resource Management** - File upload/download system with categorization and access controls
- **Messaging System** - Real-time communication with group and direct conversations
- **User Settings** - Complete profile management with avatar upload and preferences

### 📊 **Advanced Analytics**
- **Member Engagement Scoring** - Activity-based ranking system with weighted metrics
- **Dashboard Analytics** - Comprehensive statistics and member activity tracking
- **Event Performance Metrics** - Registration vs attendance analysis
- **Resource Usage Analytics** - Download patterns and popular content tracking

### 🔧 **System Features**
- **Admin Dashboard** - Modern CRM interface with complete member oversight
- **Member Dashboard** - Personalized user experience with activity feeds
- **File Management** - Secure file upload with virus scanning and access controls
- **Real-time Updates** - Live notifications and dynamic content updates
- **Responsive Design** - Mobile-friendly interface with modern UI/UX

## 🛠 Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MySQL** database with mysql2/promise driver
- **JWT Authentication** with HTTP-only cookies
- **bcryptjs** for password hashing
- **Multer** for file upload handling
- **CORS** configuration for cross-origin requests

### Frontend
- **Vanilla JavaScript** (ES6+)
- **Tailwind CSS** for responsive styling
- **HTML5** semantic structure
- **Modern Browser APIs** for file handling and notifications

### Database Schema
- **Users** - Authentication, profiles, preferences
- **Events** - Event management with capacity tracking
- **Resources** - File metadata and access controls
- **Messages & Conversations** - Real-time messaging system
- **Visits** - Event attendance tracking

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v8.0 or higher)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd together-culture
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Setup database**
   ```bash
   # Create MySQL database named 'together_culture'
   mysql -u root -p -e "CREATE DATABASE together_culture;"
   
   # Run database setup (creates tables, admin user, and 55 dummy users)
   node setup-database.js
   ```

4. **Start the backend server**
   ```bash
   npm start
   # Server will start on http://localhost:5000
   ```

5. **Access the application**
   - **Frontend:** Open `frontend/login.html` in a web server or Live Server
   - **API Backend:** Runs on `http://localhost:5000`
   - Login with admin credentials to test all features

## 🔑 Login Credentials

### Admin Account
- **Email:** `admin@togetherculture.com`
- **Password:** `admin123`
- **Access:** Full system administration with member approval workflow

### Member Accounts (55 Available)
- **Email:** `sarah.johnson@example.com` (pending approval)
- **Email:** `michael.williams1@example.com` (approved)
- **Password:** `password123` (for all member accounts)
- **Access:** Standard member features after admin approval

### 🚨 Important Security Features
- **Automatic credential removal from URLs** - Any credentials passed in URL parameters are immediately cleared for security
- **Role-based dashboard routing** - Admins and members are automatically redirected to their appropriate dashboards
- **Session protection** - All pages verify user authentication and redirect unauthorized users

*Note: 55 dummy users are created with varied statuses (approved/pending/rejected) for comprehensive testing*

## 📱 Application Structure

```
together-culture-main/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database configuration
│   ├── middleware/
│   │   └── authMiddleware.js     # Authentication & authorization
│   ├── routes/
│   │   ├── auth.js              # Login/registration endpoints
│   │   ├── admin.js             # Admin management & analytics
│   │   ├── users.js             # User profile & settings
│   │   ├── events.js            # Event management
│   │   ├── messages.js          # Messaging system
│   │   └── resources.js         # File management
│   ├── uploads/                 # File storage directory
│   ├── setup-database.js       # Database initialization
│   ├── server.js               # Main server entry point
│   └── package.json            # Node.js dependencies
├── frontend/
│   ├── css/
│   │   └── style.css           # Custom styles
│   ├── js/
│   │   ├── config.js           # API configuration
│   │   ├── auth.js             # Authentication logic
│   │   ├── admin.js            # Admin dashboard
│   │   ├── member.js           # Member dashboard
│   │   ├── events.js           # Event management UI
│   │   ├── messages.js         # Messaging interface
│   │   ├── resources.js        # Resource management
│   │   └── settings.js         # User settings
│   ├── index.html              # Landing page
│   ├── login.html              # Login interface
│   ├── register.html           # Registration form
│   ├── admin_dashboard.html    # Admin control panel
│   ├── member_dashboard.html   # Member homepage
│   ├── events.html             # Event management
│   ├── messages.html           # Messaging system
│   ├── resources.html          # Resource library
│   └── settings.html           # User settings
└── README.md                   # This file
```

## 🎯 User Workflows

### New User Registration
1. User registers at `/register.html`
2. Account created with "pending" status
3. User can login but sees "Waiting for Admin Approval" message
4. Admin approves/rejects from admin dashboard
5. Approved users gain full access to all features

### Admin Member Management
1. Login to admin dashboard
2. View pending members in approval queue
3. Review member details and activity
4. Approve/reject members individually or in bulk
5. Monitor member engagement scores and analytics

### Event Management
1. Admins create events with capacity limits
2. Members register for events (up to capacity)
3. System tracks registration vs attendance
4. Analytics show event performance metrics

### Resource Sharing
1. Users upload files with categories and access levels
2. Files stored securely with virus scanning
3. Download tracking and usage analytics
4. Access control based on user roles and permissions

### Messaging System
1. Users start direct or group conversations
2. Real-time message delivery and read receipts
3. Conversation management and participant controls
4. Message history and search functionality

## 📊 Analytics & Reporting

### Member Engagement Scoring
The system calculates engagement scores using weighted metrics:
- **40%** - Event Participation (attendance + recent activity)
- **30%** - Resource Engagement (uploads + downloads received)
- **20%** - Communication Activity (messages + conversations)
- **10%** - Profile Completeness (bio, skills, avatar)

**Engagement Levels:**
- **Highly Engaged** (80-100 points) - Active community contributors
- **Moderately Engaged** (60-79 points) - Regular participants
- **Lightly Engaged** (30-59 points) - Occasional users
- **Inactive** (0-29 points) - Minimal activity

### Dashboard Metrics
- Total members by status (approved/pending/rejected)
- Event attendance rates and trends
- Resource download patterns
- Communication activity levels
- Member growth and retention analytics

## 🔒 Security Features

### Authentication
- JWT tokens with HTTP-only cookies
- bcrypt password hashing with salt rounds
- Role-based access control (admin/member)
- Session management and secure logout

### File Security
- File type validation and size limits
- Secure file storage outside web root
- Access level controls (public/members/admin)
- Download tracking and audit trails

### Data Protection
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization
- CORS configuration for API security
- Environment variable configuration for secrets

## 🛡️ Admin Features

### Member Management & Search
- **Complete member directory** with search functionality by name, email, or role
- **Individual member activity tracking** - View all events attended and visits for each member
- **Pending member approval workflow** - Approve/reject new registrations with one-click actions
- **Bulk approval actions** for processing multiple members efficiently
- **Member engagement scoring** and analytics
- **Account management** - Edit member details, change roles, delete accounts

### Event Administration
- Create/edit/delete events with capacity limits
- Monitor registration and attendance rates
- Event performance analytics and reporting
- Calendar view with event management tools

### Resource Control
- Upload restrictions by user role
- File access level management
- Storage usage monitoring
- Download analytics and popular content tracking

### System Analytics
- Member engagement scoring and rankings
- Event attendance vs registration metrics
- Resource usage patterns and trends
- Communication activity and participation rates

## 👥 Member Features

### Profile Management
- Complete profile editing with avatar upload
- Bio, skills, and contact information
- Privacy settings and notification preferences
- Activity history and engagement tracking

### Event Participation
- Browse and search upcoming events
- Register/unregister with capacity awareness
- Calendar integration and event reminders
- Personal attendance history

### Resource Access
- Upload files with categorization
- Download resources based on access level
- Search and filter resource library
- Personal upload history and statistics

### Communication
- Start direct and group conversations
- Real-time messaging with read receipts
- User search for new conversations
- Message history and conversation management

## 🔧 Configuration

### Environment Variables
Create `.env` file in backend directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=together_culture
JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=5000
```

### Database Configuration
The application uses MySQL with the following key settings:
- Character set: utf8mb4 for full Unicode support
- Timezone: System timezone with automatic handling
- Connection pooling for performance
- Prepared statements for security

### File Upload Settings
- Maximum file size: 10MB per file
- Multiple file upload: Up to 5 files simultaneously
- Supported formats: PDF, DOC, XLS, PPT, images, archives
- Storage location: `backend/uploads/` directory

## 🚀 Deployment

### Production Setup
1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   JWT_SECRET=strong_production_secret
   DB_HOST=production_db_host
   ```

2. **Database Optimization**
   - Enable MySQL query caching
   - Configure proper indexes
   - Set up regular backups

3. **Security Hardening**
   - Enable HTTPS with SSL certificates
   - Configure firewall rules
   - Set up rate limiting

4. **Performance Optimization**
   - Enable gzip compression
   - Configure static file caching
   - Set up CDN for file delivery

## 📈 Performance Metrics

### Database Efficiency
- Indexed queries for fast member lookups
- Optimized engagement score calculations
- Efficient file metadata storage
- Connection pooling for concurrent users

### Frontend Performance
- Lazy loading for large datasets
- Efficient DOM manipulation
- Optimized image handling
- Progressive enhancement design

### File Management
- Streaming file uploads/downloads
- Efficient storage organization
- Automatic cleanup of temporary files
- Download resume capability

## 🐛 Troubleshooting

### Common Issues

**Backend Connection Issues**
```bash
# Check if backend server is running
curl http://localhost:5000/api/admin/stats

# Check MySQL service status
sudo systemctl status mysql

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"
```

**Frontend Loading Issues**
- **CORS Errors:** Ensure backend is running on `http://localhost:5000`
- **File Path Issues:** Use relative paths `./` for frontend files
- **Security Warnings:** Credentials in URL are automatically cleared for security

**Authentication Issues**
- Clear browser cookies and cache
- Verify JWT_SECRET in environment variables
- Check user status (pending/approved/rejected)
- Ensure backend server is running for API calls

**File Upload Problems**
- Check `backend/uploads/` directory permissions
- Verify file size limits in configuration
- Ensure sufficient disk space

**Performance Issues**
- Monitor database query performance
- Check server resource usage
- Optimize large file operations

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Submit pull request

### Code Standards
- Use ES6+ JavaScript features
- Follow consistent naming conventions
- Add comments for complex logic
- Test all new functionality
- Maintain responsive design principles

### Database Changes
- Create migration scripts for schema changes
- Update setup-database.js accordingly
- Test with existing data
- Document breaking changes

## 📞 Support

### Documentation
- API endpoints documented in route files
- Database schema in setup-database.js
- Frontend components in respective JS files

### Debugging
- Enable debug logging in development
- Check browser console for frontend errors
- Monitor server logs for backend issues
- Use database query logging for performance

### Community
- Report bugs through issue tracking
- Request features via enhancement proposals
- Share improvements and optimizations
- Contribute to documentation

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tailwind CSS** for responsive design framework
- **MySQL** for robust database management
- **Node.js** community for excellent ecosystem
- **Express.js** for streamlined web framework

---

## 📊 Feature Completion Status

| Feature | Status | Completion |
|---------|--------|------------|
| Authentication System | ✅ Complete | 100% |
| User Management | ✅ Complete | 100% |
| Member Approval Workflow | ✅ Complete | 100% |
| Events Management | ✅ Complete | 100% |
| Messaging System | ✅ Complete | 100% |
| Resources Management | ✅ Complete | 100% |
| User Settings & Profiles | ✅ Complete | 100% |
| Member Engagement Scoring | ✅ Complete | 100% |
| Admin Dashboard | ✅ Complete | 100% |
| Member Dashboard | ✅ Complete | 100% |

**Overall Completion: 100% Core Functionality**

The Together Culture CRM application is fully functional and ready for production use with all major features implemented and tested.

---

*For technical support or feature requests, please refer to the project documentation or contact the development team.*
