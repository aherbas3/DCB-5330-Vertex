const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test the database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
    process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Helper function to get a client from the pool
const getClient = async () => {
    return await pool.connect();
};

// Initialize database schema
const initializeDatabase = async () => {
    try {
        console.log('🔄 Initializing database schema...');
        
        // Create users table if it doesn't exist
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(50) DEFAULT 'FirstName',
                last_name VARCHAR(50) DEFAULT 'LastName',
                email VARCHAR(100) UNIQUE NOT NULL,
                phone_number VARCHAR(20) DEFAULT '999-999-9999',
                language VARCHAR(20) DEFAULT 'English',
                notifications_enabled BOOLEAN DEFAULT true
            );
        `);

        // Create index on email for faster lookups
        await query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);

        console.log('✅ Database schema initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize database schema:', error);
        throw error;
    }
};

// Test database connection
const testConnection = async () => {
    try {
        const result = await query('SELECT NOW()');
        console.log('✅ Database connection test successful:', result.rows[0]);
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
};

module.exports = {
    pool,
    query,
    getClient,
    initializeDatabase,
    testConnection
};
