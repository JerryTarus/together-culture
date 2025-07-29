# Together Culture CRM - Setup Instructions

## 🚀 Quick Setup Guide

### 1. Environment Configuration

Create a `.env` file in the `backend` directory with the following content:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=together_culture
JWT_SECRET=your_super_secret_key_here_change_in_production_2025
NODE_ENV=development
```

### 2. Database Setup

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p
CREATE DATABASE together_culture;
USE together_culture;
```

Then run the SQL script:
```bash
mysql -u root -p together_culture < fix-database.sql
```

**Option B: Using the Setup Script**
```bash
cd backend
node setup-database.js
```

### 3. Start the Application

```bash
cd backend
npm install
npm start
```

The server will start on `http://localhost:5000`

## 🔑 Login Credentials

### Admin Account
- **Email:** admin@togetherculture.com
- **Password:** admin123
- **Access:** Full admin dashboard with user management

### Sample Member Accounts
- **Email:** sarah.johnson@example.com
- **Password:** password123
- **Status:** Approved (Full access)

- **Email:** david.thompson@example.com  
- **Password:** password123
- **Status:** Pending (Limited access with approval banner)

## 🌐 Application URLs

- **Homepage:** http://localhost:5000
- **Admin Dashboard:** http://localhost:5000/admin_dashboard.html
- **Member Dashboard:** http://localhost:5000/member_dashboard.html
- **Login:** http://localhost:5000/login.html
- **Register:** http://localhost:5000/register.html

## 🛠️ Troubleshooting

### If login fails with "Server error":
1. Check that the `.env` file exists in the `backend` directory
2. Ensure MySQL is running
3. Verify the database `together_culture` exists
4. Run the database setup script: `node setup-database.js`

### If you get "Column doesn't exist" errors:
1. Run the fix script: `mysql -u root -p together_culture < fix-database.sql`
2. Or manually add missing columns:
   ```sql
   ALTER TABLE users ADD COLUMN status ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER role;
   ALTER TABLE events ADD COLUMN capacity INT DEFAULT 0 AFTER location;
   ```

### Database Connection Issues:
1. Ensure MySQL server is running
2. Check the DB credentials in `.env` file
3. Create the database: `CREATE DATABASE together_culture;`

## 📊 Current Features

### ✅ Fully Working
- User registration and login
- Admin dashboard with analytics
- Member dashboard with status
- User approval workflow
- Sample data (20 users, 10 events)

### 🔄 Partially Working
- Events viewing (works)
- Messaging (structure ready)
- Resources (basic framework)

### ❌ To Be Implemented
- Event creation/editing
- Real-time messaging
- File upload/download
- Advanced reporting

## 🧪 Testing the Application

After setup, you can test the login functionality:

```bash
node test-application.js
```

This will verify:
- Server connectivity
- Admin login
- Member login (approved)
- Pending user workflow

## 📞 Support

If you encounter any issues:
1. Check the server logs in the terminal
2. Verify the `.env` file configuration
3. Ensure all database tables exist
4. Run the setup script again if needed 