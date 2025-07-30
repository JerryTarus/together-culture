
# Together Culture CRM

A comprehensive Customer Relationship Management system built for the Together Culture community, featuring member management, event coordination, messaging, and resource sharing.

## 🚀 Features

### ✅ Complete Features
- **User Authentication & Authorization**
  - Secure login/logout with JWT tokens
  - Role-based access (Admin/Member)
  - Account approval workflow

- **Admin Dashboard**
  - Real-time analytics and statistics
  - User management and approval
  - Event creation and management
  - System-wide oversight

- **Member Dashboard**
  - Personal activity overview
  - Quick access to features
  - Status tracking and notifications

- **Events Management**
  - Create, edit, and delete events
  - RSVP functionality (Attending, Maybe, Can't Attend)
  - Event capacity tracking
  - Upcoming events highlighting
  - Past events history

- **Messaging System**
  - Private conversations between members
  - Real-time message interface
  - Member directory for new conversations

- **User Profile Management**
  - Edit personal information
  - Update notifications
  - Account settings

### 🔄 Additional Features
- **Resource Management** (Framework ready)
- **Reporting System** (Basic structure)
- **Responsive Design** (Mobile-friendly)

## 🛠️ Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Tailwind CSS
- **Authentication:** JWT with HTTP-only cookies

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- Git

### 1. Clone the Repository
```bash
git clone [repository-url]
cd together-culture-crm
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `backend` directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=together_culture
JWT_SECRET=your_super_secret_key_here_change_in_production_2025
NODE_ENV=development
```

### 4. Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE together_culture;
USE together_culture;

# Run migrations
mysql -u root -p together_culture < migrations/schema.sql
mysql -u root -p together_culture < migrations/2025_07_29_add_user_status_event_capacity.sql
mysql -u root -p together_culture < migrations/2025_07_28_add_conversations.sql
mysql -u root -p together_culture < migrations/2025_07_30_add_event_rsvps.sql
mysql -u root -p together_culture < migrations/2025_07_29_approve_admin.sql

# Or use the setup script
node setup-database.js
```

### 5. Start the Application
```bash
npm start
```

The application will be available at `http://localhost:5000`

## 🔑 Default Login Credentials

### Admin Account
- **Email:** admin@togetherculture.com
- **Password:** admin123
- **Access:** Full administrative privileges

### Sample Member Accounts
- **Email:** sarah.johnson@example.com
- **Password:** password123
- **Status:** Approved

- **Email:** david.thompson@example.com
- **Password:** password123
- **Status:** Pending

## 📱 Application Structure

### User Roles & Access

**Admin Users:**
- Full dashboard with analytics
- User management and approval
- Event creation and management
- Message all members
- System administration

**Member Users:**
- Personal dashboard
- Event browsing and RSVP
- Messaging with other members
- Profile management
- Resource access (when approved)

### Page Navigation

- **Homepage:** `/` - Public landing page
- **Login:** `/login.html` - Authentication
- **Register:** `/register.html` - New user registration
- **Admin Dashboard:** `/admin_dashboard.html` - Admin overview
- **Member Dashboard:** `/member_dashboard.html` - Member overview
- **Events:** `/events.html` - Event management
- **Messages:** `/messages.html` - Communication
- **Resources:** `/resources.html` - File sharing
- **Settings:** `/settings.html` - Profile management

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts and profiles
- `events` - Event information
- `event_rsvps` - Event attendance tracking
- `conversations` - Message threads
- `messages` - Individual messages
- `resources` - Shared files and documents

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event (Admin)
- `PUT /api/events/:id` - Update event (Admin)
- `DELETE /api/events/:id` - Delete event (Admin)
- `POST /api/events/:id/rsvp` - RSVP to event

### Messages
- `GET /api/messages/conversations` - User conversations
- `GET /api/messages/conversation/:id` - Conversation messages
- `POST /api/messages` - Send message

### Users
- `GET /api/users/members` - List members
- `PUT /api/users/profile` - Update profile
- `POST /api/admin/users/:id/approve` - Approve user (Admin)

## 🎨 Design System

### Color Palette
- **Primary:** #4F46E5 (Indigo)
- **Secondary:** #06B6D4 (Cyan)
- **Accent:** #F59E0B (Amber)
- **Dark:** #1F2937 (Gray)
- **Background:** #FEF7ED (Warm beige)

### UI Components
- Consistent button styling
- Card-based layouts
- Responsive grid systems
- Loading states and animations
- Notification system

## 🚀 Deployment

This application is designed to run on Replit with the following configuration:

```bash
# Run command
cd backend && npm start
```

The server binds to `0.0.0.0:5000` for public access.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Login Issues**
   - Clear browser cookies
   - Check user approval status
   - Verify credentials

3. **RSVP Not Working**
   - Ensure `event_rsvps` table exists
   - Check user authentication
   - Verify event exists

### Debug Mode
Set `NODE_ENV=development` in `.env` for detailed logging.

## 📞 Support

For technical issues:
1. Check the browser console for errors
2. Review server logs
3. Verify database connectivity
4. Ensure all dependencies are installed

---

**Together Culture CRM** - Building stronger communities through better connections.
