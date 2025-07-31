
const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('🔍 Database environment check: Using MySQL only');

let pool;

// MySQL configuration
    // MySQL configuration
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'together_culture_crm',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4',
        connectTimeout: 60000
    };
    
    pool = mysql.createPool(dbConfig);
    console.log('📊 Using MySQL database configuration');


// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully');
        console.log(`📊 Connected to database: ${process.env.DB_NAME || 'together_culture_crm'} on ${process.env.DB_HOST || 'localhost'}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Please check your database configuration in .env file');
        return false;
    }
};

// Enhanced query method for both databases
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
        console.log('📊 MySQL database connection pool closed');
    } catch (error) {
        console.error('Error closing MySQL database pool:', error.message);
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

module.exports = {
    pool,
    query,
    testConnection,
    closePool
};
