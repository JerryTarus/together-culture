
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

// Determine database type from environment or URL
const isDatabaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');
const isMySQL = !isDatabaseUrl;

let pool;

if (isMySQL) {
    // MySQL configuration for Replit
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'together_culture_crm',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4',
        connectTimeout: 60000,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        maxPreparedStatements: 0
    };
    
    // Create MySQL connection pool
    pool = mysql.createPool(dbConfig);
    console.log('📊 Using MySQL database configuration');
} else {
    // PostgreSQL configuration
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
    });
    console.log('📊 Using PostgreSQL database configuration');
}

// Test database connection on startup
const testConnection = async () => {
    try {
        if (isMySQL) {
            const connection = await pool.getConnection();
            console.log('✅ MySQL Database connected successfully');
            console.log(`📊 Connected to database: ${process.env.DB_NAME || 'together_culture'} on ${process.env.DB_HOST || 'localhost'}`);
            connection.release();
        } else {
            const client = await pool.connect();
            console.log('✅ PostgreSQL Database connected successfully');
            console.log(`📊 Connected to PostgreSQL database`);
            client.release();
        }
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Please check your database configuration in .env file');
        console.error('For Replit, consider using the built-in PostgreSQL database');
        return false;
    }
};

// Enhanced query method with error handling for both MySQL and PostgreSQL
const query = async (sql, params = []) => {
    try {
        if (isMySQL) {
            const [rows, fields] = await pool.execute(sql, params);
            return [rows, fields];
        } else {
            // Convert MySQL-style queries to PostgreSQL-style
            let pgSql = sql;
            let pgParams = params;
            
            // Convert ? placeholders to $1, $2, etc. for PostgreSQL
            let paramIndex = 1;
            pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
            
            const result = await pool.query(pgSql, pgParams);
            return [result.rows, result.fields];
        }
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
    closePool,
    isMySQL,
    isDatabaseUrl
};
