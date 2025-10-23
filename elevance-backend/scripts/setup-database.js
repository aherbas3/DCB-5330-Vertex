#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script helps set up the PostgreSQL database for the Elevance app.
 * Run this script to initialize the database schema and test the connection.
 * 
 * Usage: node scripts/setup-database.js
 */

require('dotenv').config();
const { initializeDatabase, testConnection } = require('../database');

async function setupDatabase() {
    console.log('🚀 Starting database setup...\n');

    try {
        // Test database connection
        console.log('1️⃣ Testing database connection...');
        const connected = await testConnection();
        
        if (!connected) {
            console.error('❌ Database connection failed!');
            console.error('Please check your DATABASE_URL in the .env file');
            process.exit(1);
        }

        // Initialize database schema
        console.log('\n2️⃣ Initializing database schema...');
        await initializeDatabase();

        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Make sure your .env file has the correct DATABASE_URL');
        console.log('   2. Start your server with: npm start');
        console.log('   3. Test the API endpoints');

    } catch (error) {
        console.error('\n❌ Database setup failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('   - Check your DATABASE_URL in .env file');
        console.error('   - Ensure your Neon database is accessible');
        console.error('   - Verify your database credentials');
        process.exit(1);
    }
}

// Run the setup
setupDatabase();
