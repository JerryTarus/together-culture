
# Together Culture - Community CRM Platform

A comprehensive Community Relationship Management (CRM) platform designed to strengthen community connections through events, messaging, resource sharing, and member management.

## 🌟 Features

### ✅ Fully Implemented
- **User Authentication & Authorization**
  - Secure login/registration with JWT tokens
  - Role-based access control (Admin/Member)
  - User approval workflow
  - Password hashing with bcrypt

- **Admin Dashboard**
  - User management (approve/reject/view members)
  - System analytics and statistics
  - Recent activity monitoring
  - Comprehensive user overview

- **Member Dashboard**
  - Personalized member experience
  - Profile management
  - Quick access to platform features

- **Events Management**
  - Create, view, and manage events
  - RSVP functionality
  - Event capacity tracking
  - Admin event oversight

- **Messaging System**
  - Real-time member-to-member communication
  - Conversation management
  - Message persistence
  - User-friendly chat interface

- **Resource Library**
  - File upload/download functionality
  - Resource categorization
  - Admin resource management
  - Secure file handling

- **Settings & Profile Management**
  - User profile updates
  - Password changes with feedback
  - Account preferences

### 🔧 Technical Features
- **Security**: JWT authentication, secure cookies, password hashing
- **Database**: MySQL with proper migrations
- **Frontend**: Responsive design with Tailwind CSS
- **Backend**: Express.js RESTful API
- **File Handling**: Multer for secure file uploads

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd together-culture-crm
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies (if needed)
   cd ../frontend
   npm install
   ```

3. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE together_culture;
   
   # Run database setup
   cd backend
   node setup-database.js
   ```

4. **Environment Configuration**
   ```bash
   # Create .env file in backend directory
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Start the application**
   ```bash
   cd backend
   npm start
   ```

6. **Access the application**
   - Open your browser to `http://localhost:5000`
   - Use the default admin credentials:
     - Email: `admin@togetherculture.com`
     - Password: `admin123`

## 🏗️ Architecture

### Backend Structure
```
backend/
├── config/          # Database configuration
├── middleware/      # Authentication middleware
├── routes/          # API endpoints
├── migrations/      # Database migrations
├── uploads/         # File storage
└── server.js        # Main server file
```

### Frontend Structure
```
frontend/
├── css/            # Stylesheets
├── js/             # JavaScript modules
├── *.html          # Page templates
└── favicon.ico     # Site icon
```

## 🔐 Default Users

The system comes with pre-configured test users:

**Admin User:**
- Email: `admin@togetherculture.com`
- Password: `admin123`
- Status: Active

**Test Members:**
- Sarah Johnson: `sarah.johnson@example.com` / `password123` (Approved)
- David Thompson: `david.thompson@example.com` / `password123` (Pending)
- James Wilson: `james.wilson@example.com` / `password123` (Rejected)

## 📊 Database Schema

- **users**: User accounts and profiles
- **events**: Community events and activities
- **event_rsvps**: Event registration tracking
- **messages**: Inter-member communications
- **conversations**: Message threading
- **resources**: File and document library

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/recent-activity` - Recent system activity

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (Admin)
- `PUT /api/events/:id` - Update event (Admin)
- `POST /api/events/:id/rsvp` - RSVP to event

### Messages
- `GET /api/messages` - Get conversations
- `POST /api/messages` - Send message
- `GET /api/messages/conversation/:userId` - Get conversation with user

### Resources
- `GET /api/resources` - List resources
- `POST /api/resources/upload` - Upload resource (Admin)
- `GET /api/resources/:id/download` - Download resource
- `DELETE /api/resources/:id` - Delete resource (Admin)

## 🔒 Security Features

- JWT-based authentication
- Secure HTTP-only cookies
- Password hashing with bcrypt
- Role-based access control
- SQL injection prevention
- File upload validation
- CORS protection

## 🎨 UI/UX Features

- Responsive design for all devices
- Modern, clean interface
- Interactive animations
- Toast notifications
- Loading states
- Error handling
- Accessibility considerations

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure MySQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **Login Issues**
   - Clear browser cookies
   - Check user status (must be approved)
   - Verify credentials

3. **File Upload Issues**
   - Check file size limits
   - Ensure upload directory exists
   - Verify file permissions

### Development

```bash
# View logs
cd backend
npm run dev

# Database reset
node setup-database.js

# Test login functionality
node test-application.js
```

## 🚀 Deployment

The application is designed to run on Replit and can be easily deployed:

1. Fork this repository to your Replit workspace
2. Configure environment variables in Replit Secrets
3. Run the application using the provided run configuration

## 📞 Support

For technical support or feature requests, please contact the development team or create an issue in the repository.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Together Culture CRM** - Building stronger communities through technology.
