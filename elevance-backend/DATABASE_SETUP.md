# PostgreSQL Database Setup

This guide explains how to set up PostgreSQL integration with your Elevance app.

## Prerequisites

- A Neon PostgreSQL database (or any PostgreSQL database)
- Node.js and npm installed
- Your existing Firebase configuration

## Database Schema

The app uses a `users` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) DEFAULT 'FirstName',
    last_name VARCHAR(50) DEFAULT 'LastName',
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) DEFAULT '999-999-9999',
    language VARCHAR(20) DEFAULT 'English',
    notifications_enabled BOOLEAN DEFAULT true
);
```

## Setup Steps

### 1. Install Dependencies

The PostgreSQL dependency (`pg`) has been added to `package.json`. Install it:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory with your database connection string:

```env
# Your existing Firebase config...
FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase variables

# PostgreSQL Database Configuration
DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require
```

**For Neon Database:**
- Go to your Neon dashboard
- Copy the connection string from your project
- It should look like: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

### 3. Initialize Database Schema

Run the database setup script:

```bash
node scripts/setup-database.js
```

This will:
- Test your database connection
- Create the `users` table if it doesn't exist
- Create necessary indexes
- Verify everything is working

### 4. Start the Server

```bash
npm start
```

The server will automatically:
- Test the database connection on startup
- Initialize the schema if needed
- Start the API server

## Database Service Layer

The app includes a `UserService` class (`services/userService.js`) with methods for:

- `createUser(userData)` - Create a new user
- `getUserById(id)` - Get user by ID
- `getUserByEmail(email)` - Get user by email
- `updateUser(email, updateData)` - Update user profile
- `deleteUser(email)` - Delete user
- `userExists(email)` - Check if user exists
- `syncUser(userData)` - Create or update user (smart sync)

## Integration with Existing Firebase Auth

The PostgreSQL integration works alongside your existing Firebase authentication:

1. **User Signup/Login**: Firebase handles authentication
2. **Profile Sync**: When users authenticate, their data is synced to PostgreSQL using email as the identifier
3. **Profile Management**: Frontend reads/writes to PostgreSQL via API
4. **Data Consistency**: Email is used as the unique identifier to link Firebase Auth with PostgreSQL

## Next Steps

After setting up the database:

1. **Update Auth Controller**: Modify `auth/controller.js` to sync with PostgreSQL
2. **Create API Endpoints**: Add routes for PostgreSQL operations
3. **Update Frontend**: Modify profile page to use PostgreSQL data
4. **Migration**: Move existing Firestore data to PostgreSQL

## Troubleshooting

### Connection Issues
- Verify your `DATABASE_URL` is correct
- Check if your database allows connections from your IP
- Ensure SSL is properly configured

### Schema Issues
- The setup script will create tables automatically
- Check database logs for any permission issues
- Ensure your database user has CREATE TABLE permissions

### Server Issues
- Check that all environment variables are set
- Verify the database is accessible from your server
- Look at server logs for specific error messages
