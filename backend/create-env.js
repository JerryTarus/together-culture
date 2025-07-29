const fs = require('fs');
const path = require('path');

// Environment configuration content
const envContent = `DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=together_culture
JWT_SECRET=together_culture_jwt_secret_2025_super_secure_key_change_in_production
NODE_ENV=development
PORT=5000`;

// Path to the .env file
const envPath = path.join(__dirname, '.env');

// Create the .env file
try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('📁 Location:', envPath);
    console.log('📋 Content:');
    console.log(envContent);
    console.log('\n🚀 You can now restart the server with: npm start');
} catch (error) {
    console.error('❌ Error creating .env file:', error);
} 