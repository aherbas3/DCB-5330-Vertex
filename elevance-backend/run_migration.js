const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const migrationPath = path.join(__dirname, 'migrations', 'redesign_provider_slots.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration: redesign_provider_slots.sql');
        console.log('This will:');
        console.log('1. Drop and recreate provider_slots table');
        console.log('2. Generate actual datetime slots for next 30 days');
        console.log('3. Booking will move slots from provider_slots to appointments');
        console.log('4. Cancelling will move slots back to provider_slots\n');

        await pool.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('Provider slots have been generated for the next 30 days.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration();
