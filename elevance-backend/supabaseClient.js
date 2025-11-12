const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
        auth: { persistSession: false },
    }
);

// PostgreSQL pool for raw SQL queries (needed for PostGIS functions)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Helper function for raw SQL queries
async function query(sql, params = []) {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result;
    } finally {
        client.release();
    }
}

module.exports = { supabase, query, pool };
