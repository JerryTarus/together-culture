# Together Culture CRM

A comprehensive full-stack Customer Relationship Management (CRM) web application built specifically for Together Culture, a Community Interest Company. This platform facilitates the transition from manual member management to a complete digital solution, supporting community building, event management, visit tracking, resource sharing, and internal communication.

## 🎯 Project Overview

Together Culture is a Community Interest Company that gathers a membership community united in their desire to help create a more equitable and ecological creative economy. The organization provides facilities, creative leadership, entrepreneurial development, momentum, structure, and resources for people to come together and make change happen.

This CRM system addresses the organization's need to transition from manual customer data management to a sophisticated digital solution that can scale with their growing community.

## 🚀 Complete Feature Set

### 🔐 Authentication & Security System
- **JWT-based Authentication:** Secure login with HTTP-only cookies
- **Role-Based Access Control:** Strict separation between admin and member permissions
- **Password Security:** Bcrypt hashing with salt rounds for password protection
- **Session Management:** Automatic logout and session validation
- **Protected Routes:** Middleware-based route protection for all sensitive pages
- **CORS Configuration:** Flexible cross-origin resource sharing for development

### 👨‍💼 Administrator Features

#### **Dashboard & Analytics**
- **Comprehensive Dashboard:** Real-time overview of key community metrics
- **Member Statistics:** Total member count with growth tracking
- **Event Analytics:** Total events created and upcoming event counts
- **Visit Metrics:** Complete visit tracking with attendance statistics
- **Activity Monitoring:** Recent activity logs and engagement metrics

#### **Member Management System**
- **Complete Member Directory:** Searchable, sortable member database
- **Full CRUD Operations:** Create, Read, Update, Delete member records
- **Profile Management:** Edit member details including bio, skills, contact information
- **Role Management:** Assign and modify user roles (admin/member)
- **Member Activity Tracking:** Comprehensive view of individual member engagement
- **Advanced Search:** Filter and search members by various criteria
- **Bulk Operations:** Mass member management capabilities

#### **Event Management Platform**
- **Event Creation:** Create detailed events with title, description, date, location
- **Event Editing:** Modify existing event details and information
- **Event Deletion:** Remove events with cascading data cleanup
- **Event Calendar:** Chronological view of all community events
- **Event Details:** Rich event descriptions with multimedia support

#### **Visit Tracking & Attendance**
- **Attendance Recording:** Log member visits to specific events
- **Visit History:** Complete chronological record of member attendance
- **Attendance Analytics:** Track engagement patterns and frequency
- **Visit Validation:** Prevent duplicate visit records
- **Date Tracking:** Accurate visit date logging with validation
- **Bulk Check-in:** Efficient mass attendance recording

#### **Member Activity Intelligence**
- **Individual Activity Logs:** Detailed timeline of member engagement
- **Event Participation:** Track which events each member has attended
- **Communication History:** View messaging activity for each member
- **Engagement Metrics:** Analyze member involvement and participation
- **Activity Export:** Generate reports on member engagement

#### **Resource Management Library**
- **File Upload System:** Secure document and media uploads
- **File Organization:** Categorized resource library management
- **Access Control:** Manage who can view and download resources
- **File Validation:** Security checks for uploaded content
- **Storage Management:** Organized file system with proper naming

#### **Communication Platform**
- **Two-Way Messaging:** Direct messaging with members
- **Conversation Management:** Organized chat threads
- **Message History:** Complete communication records
- **Unread Tracking:** Monitor message status and responses
- **Bulk Messaging:** Broadcast capabilities to multiple members

### 👥 Member Features

#### **Personal Dashboard**
- **Member Portal:** Personalized dashboard with relevant information
- **Profile Overview:** Quick access to personal information and stats
- **Activity Summary:** Personal engagement metrics and history
- **Quick Navigation:** Easy access to all platform features

#### **Profile & Settings Management**
- **Profile Editing:** Update personal information, bio, and skills
- **Password Management:** Secure password change functionality
- **Email Updates:** Modify contact information
- **Privacy Settings:** Control personal information visibility
- **Account Security:** Manage authentication preferences

#### **Event Discovery & Participation**
- **Event Catalog:** Browse all available community events
- **Event Details:** View comprehensive event information
- **Event Calendar:** Visual calendar interface for event planning
- **Personal Schedule:** Track events of interest
- **Event History:** View past event participation

#### **Resource Access Center**
- **Resource Library:** Browse and access shared documents
- **Download Center:** Secure file download functionality
- **Resource Search:** Find specific documents and materials
- **Category Browsing:** Navigate resources by type or topic
- **Recent Resources:** Quick access to newly added materials

#### **Interactive Communication**
- **Direct Messaging:** Chat with admins and other members
- **Conversation Threads:** Organized message history
- **Real-time Notifications:** Unread message indicators
- **Member Directory:** Browse and connect with other members
- **Communication Preferences:** Manage notification settings

### 🎨 User Experience & Design

#### **Responsive Design System**
- **Mobile-First:** Optimized for all device sizes
- **Tailwind CSS:** Modern, utility-first styling framework
- **Brand Consistency:** Together Culture's visual identity throughout
- **Accessibility:** WCAG-compliant design principles
- **Intuitive Navigation:** User-friendly interface design

#### **Performance & Optimization**
- **Fast Loading:** Optimized assets and efficient code
- **Smooth Interactions:** Responsive UI with loading states
- **Error Handling:** Comprehensive error management and user feedback
- **Form Validation:** Real-time validation with helpful messages
- **Progressive Enhancement:** Works across different browser capabilities

## 🛠️ Technology Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript (No frameworks)
- **Backend:** Node.js with Express
- **Database:** MySQL

## ⚙️ Project Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- A MySQL server (e.g., via [XAMPP](https://www.apachefriends.org/index.html))

### Installation Steps

1.  **Clone the Repository**

    ```bash
    git clone <your-repository-url>
    cd together-culture-crm
    ```

2.  **Backend Setup**

    - Navigate to the backend directory: `cd backend`
    - Install dependencies: `npm install`
    - Create a `.env` file in the `backend` directory and add your credentials:
      ```env
      DB_HOST=localhost
      DB_USER=root
      DB_PASSWORD=
      DB_NAME=together_culture
      JWT_SECRET=your_super_secret_key_here
      ```
    - Start your MySQL server (e.g., via XAMPP).
    - Create a new database named `together_culture`.
    - Import the database schema by executing the SQL statements below in your database client.

3.  **Running the Application**
    - In the `backend` directory, start the server:
      ```bash
      npm start
      ```
    - The application will be available at `http://localhost:5000`.

## 🗃️ Database Schema

The application uses a MySQL database with the following tables:

```sql
-- Users table for authentication and profiles
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin', 'member') DEFAULT 'member',
    bio TEXT,
    skills TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Events table for community events
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150),
    description TEXT,
    event_date DATE,
    location VARCHAR(100)
) ENGINE=InnoDB;

-- Visits table for tracking event attendance
CREATE TABLE visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    visit_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Conversations table for messaging system
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_pair (user1_id, user2_id),
    CONSTRAINT fk_user1 FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user2 FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Messages table for conversation messages
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_status BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Resources table for file sharing
CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150),
    file_url VARCHAR(255),
    original_name VARCHAR(255),
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

## 🔧 Setup Instructions

1. **Database Setup**
   - Create a MySQL database named `together_culture_crm`
   - Run the schema file: `backend/migrations/schema.sql`
   - Optionally run: `backend/migrations/2025_07_28_add_conversations.sql`

2. **Environment Configuration**
   - Copy `.env.example` to `.env` in the backend folder
   - Update database credentials and JWT secret

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm start
   ```
   - The backend will run on `http://localhost:5000`

4. **Frontend Configuration**
   - The frontend is configured to connect to `http://localhost:5000` by default
   - If your backend runs on a different port, edit `frontend/js/config.js` and change the `API_BASE_URL`
   - Example: Change `API_BASE_URL: 'http://localhost:5000'` to your backend URL

5. **Access the Application**
   - You can serve the frontend from any port (using Live Server, Python HTTP server, etc.)
   - Example: `cd frontend && python -m http.server 8080`
   - Open your frontend URL in the browser (e.g., `http://localhost:8080`)
   - Register as the first admin user or create test accounts

### 🌐 Development Notes

- **CORS Configuration**: The backend is configured to accept requests from any localhost port for development
- **Flexible Frontend**: The frontend can run on any port and will communicate with the backend properly
- **API Configuration**: All API calls use the centralized config in `frontend/js/config.js`

## ✅ Implementation Status

### **Core Requirements - COMPLETED**
- ✅ **Data Repository** - Complete member and activity storage system
- ✅ **Password Protected Access** - JWT-based authentication for member-only areas
- ✅ **User Profile Management** - Full profile setup and maintenance capabilities
- ✅ **Role-Based Functionality** - Granular permission system (admin/member roles)
- ✅ **Member Activity Tracking** - Admin search and view of individual member activities
- ✅ **Event & Visit Management** - Complete event lifecycle with attendance tracking

### **Advanced Features - COMPLETED**
- ✅ **Authentication & Security** - JWT with HTTP-only cookies, bcrypt password hashing
- ✅ **Role-Based Access Control** - Admin and member roles with appropriate permissions
- ✅ **Member Management System** - Full CRUD operations with activity intelligence
- ✅ **Event Management Platform** - Complete event lifecycle management
- ✅ **Visit Tracking & Analytics** - Comprehensive attendance monitoring
- ✅ **Resource Management** - File upload/download with secure storage
- ✅ **Communication System** - Two-way messaging with real-time features
- ✅ **User Settings & Profiles** - Complete profile and password management
- ✅ **Analytics Dashboard** - Real-time metrics and engagement tracking
- ✅ **Responsive Design** - Mobile-friendly interface with modern UI
- ✅ **Data Validation** - Frontend and backend validation with error handling
- ✅ **Security Features** - CORS, file validation, SQL injection prevention
- ✅ **Cross-Platform Support** - Flexible port configuration for development

## 🚧 Missing Features & Improvement Opportunities

### **📊 Advanced Analytics & Reporting**
- ❌ **Export Functionality** - CSV/PDF export for member and activity data
- ❌ **Advanced Analytics** - Engagement trends, growth metrics, retention analysis
- ❌ **Custom Reports** - Configurable reporting with date ranges and filters
- ❌ **Dashboard Customization** - Personalized dashboard widgets for admins
- ❌ **Member Engagement Scoring** - Automated engagement level calculations

### **📧 Communication Enhancements**
- ❌ **Email Integration** - Automated email notifications for events and messages
- ❌ **Bulk Email System** - Newsletter and announcement capabilities
- ❌ **Message Templates** - Pre-configured message templates for common communications
- ❌ **Push Notifications** - Real-time browser notifications for new messages
- ❌ **Group Messaging** - Multi-participant chat rooms and discussion groups

### **📅 Event & Calendar Features**
- ❌ **Event Registration** - Member self-registration for events with capacity limits
- ❌ **Calendar Integration** - Export events to external calendars (Google, Outlook)
- ❌ **Event Categories** - Categorization and filtering of events by type
- ❌ **Recurring Events** - Support for repeating events and series
- ❌ **Event Reminders** - Automated reminder system for upcoming events
- ❌ **Waitlist Management** - Queue system for fully booked events

### **👥 Advanced Member Features**
- ❌ **Member Self-Registration** - Public registration form with admin approval
- ❌ **Skill Matching** - Connect members with complementary skills
- ❌ **Member Projects** - Project collaboration and team formation features
- ❌ **Achievement System** - Badges and recognition for member participation
- ❌ **Member Directory Search** - Advanced search by skills, interests, location
- ❌ **Privacy Controls** - Granular privacy settings for profile information

### **🔧 System Administration**
- ❌ **Backup & Recovery** - Automated database backup system
- ❌ **Audit Logging** - Comprehensive system activity logging
- ❌ **System Health Monitoring** - Performance metrics and alerts
- ❌ **Multi-Admin Support** - Multiple administrator roles with different permissions
- ❌ **Data Import/Export** - Bulk data migration tools
- ❌ **System Configuration** - Admin panel for system-wide settings

### **📱 Mobile & API Features**
- ❌ **Mobile App** - Native mobile application for iOS/Android
- ❌ **REST API Documentation** - Comprehensive API documentation for integrations
- ❌ **Third-Party Integrations** - Connect with external tools (Slack, Mailchimp, etc.)
- ❌ **Offline Functionality** - Limited offline access for mobile users
- ❌ **Progressive Web App** - PWA features for enhanced mobile experience

### **🎨 UI/UX Enhancements**
- ❌ **Dark Mode** - Alternative color scheme option
- ❌ **Accessibility Improvements** - Enhanced screen reader support and keyboard navigation
- ❌ **Multi-Language Support** - Internationalization for different languages
- ❌ **Advanced Search** - Global search functionality across all content
- ❌ **Drag & Drop Interface** - Enhanced file upload and organization features
- ❌ **Customizable Themes** - User-selectable color schemes and layouts

### **🔐 Advanced Security Features**
- ❌ **Two-Factor Authentication** - Enhanced security with 2FA
- ❌ **Single Sign-On (SSO)** - Integration with external authentication providers
- ❌ **Rate Limiting** - API protection against abuse
- ❌ **Data Encryption** - Enhanced data protection for sensitive information
- ❌ **Security Audit Tools** - Automated security scanning and reporting

## 🎯 Priority Recommendations

### **High Priority (Essential for Production)**
1. **Export Functionality** - Critical for data portability and reporting
2. **Email Integration** - Essential for member communication and engagement
3. **Member Self-Registration** - Reduce admin workload and improve accessibility
4. **Backup & Recovery** - Critical for data protection and business continuity
5. **Two-Factor Authentication** - Enhanced security for sensitive data

### **Medium Priority (Enhanced Functionality)**
1. **Event Registration System** - Improve event management efficiency
2. **Advanced Analytics** - Better insights into member engagement
3. **Group Messaging** - Enhanced community building features
4. **Calendar Integration** - Improved user experience for event planning
5. **Progressive Web App** - Better mobile experience without native app

### **Low Priority (Nice to Have)**
1. **Dark Mode** - Improved user experience option
2. **Multi-Language Support** - Expand accessibility
3. **Achievement System** - Gamification for increased engagement
4. **Third-Party Integrations** - Enhanced workflow efficiency
5. **Customizable Themes** - Personalization options
