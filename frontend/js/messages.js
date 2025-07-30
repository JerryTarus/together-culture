<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRM Application</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333;
        }

        /* Navigation Bar */
        nav {
            background-color: #333;
            color: white;
            padding: 10px 0;
            text-align: center;
        }

        nav a {
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            display: inline-block;
        }

        /* Homepage Styling */
        .homepage {
            padding: 20px;
            text-align: center;
        }

        .homepage h1 {
            color: #333;
        }

        .homepage p {
            font-size: 1.1em;
            line-height: 1.6;
            margin-bottom: 20px;
        }

        /* Interactive Cards */
        .card-container {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 20px;
            padding: 20px;
        }

        .card {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
            width: 300px;
            text-align: left;
            transition: transform 0.3s ease-in-out;
            border: 1px solid #ddd;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .card h3 {
            color: #333;
            margin-bottom: 10px;
        }

        .card p {
            color: #666;
        }

        /* Button Styling */
        .button {
            background-color: #5cb85c; /* Green */
            border: none;
            color: white;
            padding: 12px 24px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin: 4px 2px;
            cursor: pointer;
            border-radius: 5px;
            transition: background-color 0.3s;
        }

        .button:hover {
            background-color: #449d44;
        }

        /* Footer Styling */
        footer {
            background-color: #333;
            color: white;
            text-align: center;
            padding: 10px 0;
            position: fixed;
            bottom: 0;
            width: 100%;
        }

        /* Login and Signup Pages */
        .auth-page {
            max-width: 400px;
            margin: 50px auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .auth-page h2 {
            text-align: center;
            color: #333;
        }

        .auth-page form {
            display: flex;
            flex-direction: column;
        }

        .auth-page label {
            margin-top: 10px;
            color: #333;
        }

        .auth-page input {
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        /* Message Styling */
        #message {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #5cb85c;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            display: none;
        }
    </style>
</head>
<body>

    <!-- Navigation Bar -->
    <nav>
        <a href="/">Home</a>
        <a href="/dashboard.html">Dashboard</a>
        <a href="/community.html">Community</a>
        <a href="/events.html">Events</a>
        <a href="/messages.html">Messages</a>
        <a href="/settings.html">Settings</a>
        <a href="/login.html">Login</a>
        <a href="/signup.html">Signup</a>
    </nav>

    <!-- Homepage Content -->
    <div class="homepage">
        <h1>Welcome to Our CRM</h1>
        <p>Your all-in-one solution for managing customer relationships and building a thriving community.</p>

        <!-- Interactive Cards -->
        <div class="card-container">
            <div class="card">
                <h3>Manage Contacts</h3>
                <p>Easily organize and access your contacts, leads, and customers.</p>
                <a href="/contacts.html" class="button">Learn More</a>
            </div>
            <div class="card">
                <h3>Track Interactions</h3>
                <p>Keep a detailed record of all interactions with your contacts.</p>
                <a href="/interactions.html" class="button">Learn More</a>
            </div>
            <div class="card">
                <h3>Build Community</h3>
                <p>Foster a strong community around your brand and engage with your audience.</p>
                <a href="/community.html" class="button">Learn More</a>
            </div>
        </div>
    </div>

    <!-- Login Page -->
    <div class="auth-page" id="login-page" style="display: none;">
        <h2>Login</h2>
        <form id="login-form">
            <label for="login-email">Email</label>
            <input type="email" id="login-email" name="login-email" required>
            <label for="login-password">Password</label>
            <input type="password" id="login-password" name="login-password" required>
            <button type="submit" class="button">Login</button>
            <a href="/" class="button">Back to Home</a> <!-- Homepage Navigation Button -->
        </form>
    </div>

    <!-- Signup Page -->
    <div class="auth-page" id="signup-page" style="display: none;">
        <h2>Signup</h2>
        <form id="signup-form">
            <label for="signup-name">Name</label>
            <input type="text" id="signup-name" name="signup-name" required>
            <label for="signup-email">Email</label>
            <input type="email" id="signup-email" name="signup-email" required>
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" name="signup-password" required>
            <button type="submit" class="button">Signup</button>
            <a href="/" class="button">Back to Home</a> <!-- Homepage Navigation Button -->
        </form>
    </div>

    <!-- Message Area -->
    <div id="message"></div>

    <!-- Footer -->
    <footer>
        &copy; 2024 CRM Application. All rights reserved.
    </footer>

    <script>
        function showMessage(message, type, duration) {
            const messageDiv = document.getElementById('message');
            messageDiv.innerText = message;
            messageDiv.style.backgroundColor = type === 'success' ? '#5cb85c' : '#d9534f';
            messageDiv.style.display = 'block';

            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, duration);
        }

        // Example Logout Function (Adjust as needed)
        function logout() {
            // Clear any local storage/session data
            localStorage.clear();
            sessionStorage.clear();

            // Show logout message and redirect to homepage
            showMessage('Logged out successfully. Redirecting...', 'success', 1500);
            setTimeout(() => {
                window.location.href = '/';
            }, 1600);
        }

         // Add event listeners or other scripts here as needed
    </script>
</body>
</html>