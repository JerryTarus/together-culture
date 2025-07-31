
#!/bin/bash
echo "🔧 Starting MySQL service..."
sudo service mysql start

echo "🔧 Waiting for MySQL to be ready..."
sleep 3

echo "🚀 Starting the application..."
cd backend && npm start
