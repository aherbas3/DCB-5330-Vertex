const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const migrationPath = path.join(__dirname, 'migrations', 'add_notification_method_to_users.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration: add_notification_method_to_users.sql');
        console.log('This will:');
        console.log('1. Add notification_method column to users table (if it doesn\'t exist)');
        console.log('2. Set default value to "SMS" for all existing users');
        console.log('3. Add constraint to only allow "SMS" or "WhatsApp" values');
        console.log('4. Migration is idempotent (safe to run multiple times)\n');

        await pool.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('The notification_method column has been added to the users table.');
        console.log('All existing users have been set to "SMS" as default.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration();

