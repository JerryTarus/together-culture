
require('dotenv').config();

console.log('🔍 Environment Variable Check:');
console.log('================================');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL starts with postgres:', process.env.DATABASE_URL.startsWith('postgres'));
    console.log('DATABASE_URL (first 50 chars):', process.env.DATABASE_URL.substring(0, 50) + '...');
}
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
