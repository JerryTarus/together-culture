const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'together_culture',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection on startup
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        console.log(`📊 Connected to database: ${dbConfig.database} on ${dbConfig.host}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Please check your database configuration in .env file');
        return false;
    }
};

// Enhanced query method with error handling
const query = async (sql, params = []) => {
    try {
        const [rows, fields] = await pool.execute(sql, params);
        return [rows, fields];
    } catch (error) {
        console.error('Database query error:', {
            sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
            params,
            error: error.message
        });
        throw error;
    }
};

// Graceful shutdown
const closePool = async () => {
    try {
        await pool.end();
        console.log('📊 Database connection pool closed');
    } catch (error) {
        console.error('Error closing database pool:', error.message);
    }
};

// Test connection on module load
testConnection();

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n🔄 Gracefully shutting down database connections...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Gracefully shutting down database connections...');
    await closePool();
    process.exit(0);
});

// Export enhanced pool with custom query method
module.exports = {
    ...pool,
    query,
    testConnection,
    closePool
};