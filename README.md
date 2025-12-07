# Elevance Health Platform

A comprehensive healthcare appointment management platform that connects patients with healthcare providers, manages appointments, and sends automated reminders via SMS and WhatsApp.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Reminder Scripts](#reminder-scripts)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)

## Features

- **User Authentication**: Secure authentication via Firebase
- **Provider Search**: Find healthcare providers with filtering by location, specialty, and cost
- **Appointment Booking**: Book and manage appointments with real-time availability
- **Notifications**: Automated SMS and WhatsApp notifications for appointment confirmations and reminders
- **Preventive Care Tracking**: Track and manage preventive care due dates
- **Distance Calculation**: Real-time driving distance calculation using Google Maps API
- **Calendar Integration**: Google Calendar integration for appointment scheduling

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** via Supabase
- **Firebase Admin SDK** for authentication
- **Twilio** for SMS and WhatsApp notifications
- **Google APIs** for Maps and Calendar integration
- **Resend** for email notifications

### Frontend
- **React Native** with Expo
- **Expo Router** for navigation
- **Firebase Authentication**
- **Mapbox** for map visualization
- **React Native Maps** for location services

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **PostgreSQL** database (or Supabase account)
- **Firebase** account and project
- **Twilio** account (for SMS/WhatsApp)
- **Google Cloud** account (for Maps and Calendar APIs)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DCB-5330-Vertex
   ```

2. **Install backend dependencies**
   ```bash
   cd elevance-backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../elevance-frontend
   npm install
   ```

## Environment Variables

### Backend (`elevance-backend/.env`)

Create a `.env` file in the `elevance-backend` directory with the following variables:

```env
# Server
PORT=5050

# Database
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Google APIs
GOOGLE_MAPS_API_KEY=your-maps-api-key
GOOGLE_CALENDAR_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=your-redirect-uri

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Demo User (for reminder scripts)
DEMO_USER_ID=your-demo-user-database-id
```

### Frontend (`elevance-frontend/.env`)

Create a `.env` file in the `elevance-frontend` directory:

```env
# Firebase Client
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_PROJECT_ID=your-project-id
EXPO_PUBLIC_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_APP_ID=your-app-id

# Backend API
EXPO_PUBLIC_API_URL=http://localhost:5050
```

## Database Setup

### Running Migrations

The project includes SQL migration files in `elevance-backend/migrations/`. To run migrations:

1. **Run a specific migration**
   ```bash
   cd elevance-backend
   node run_migration.js migrations/your_migration.sql
   ```

2. **Available migrations**
   - `create_provider_slots.sql` - Creates provider availability slots
   - `redesign_provider_slots.sql` - Redesigns provider slots structure
   - `add_notification_method_to_users.sql` - Adds notification method preference
   - `add_preventive_due_dates_to_users.sql` - Adds preventive care tracking

### Database Schema

Key tables:
- `users` - User accounts and preferences
- `providers` - Healthcare provider information
- `appointments` - Appointment records
- `provider_slots` - Provider availability
- `notifications` - Notification logs

## Running the Application

### Backend Server

1. **Start the backend server**
   ```bash
   cd elevance-backend
   node server.js
   ```

   The server will start on `http://localhost:5050` (or the port specified in your `.env` file).

2. **Development mode with auto-reload** (if using nodemon)
   ```bash
   npm install -g nodemon
   nodemon server.js
   ```

### Frontend Application

1. **Start the Expo development server**
   ```bash
   cd elevance-frontend
   npm start
   ```

2. **Run on specific platform**
   ```bash
   # Web
   npm run web

   ```

## Reminder Scripts

The platform includes automated reminder scripts that send SMS or WhatsApp notifications to users for upcoming appointments and preventive care due dates.

### Running Reminder Scripts

**Run both reminder scripts (appointment and preventive):**
```bash
cd elevance-backend
npm run reminders:demo
```

This command will:
1. Run appointment reminders (checks for appointments 5 days and 1 day away)
2. Run preventive care reminders (checks for preventive care items 30, 7, and 0 days away)

**Run individual scripts:**

```bash
# Appointment reminders only
node test_appointment_reminders.js

# Preventive care reminders only
node test_preventive_reminders.js
```

### How Reminder Scripts Work

#### Appointment Reminders (`runAppointmentReminders.js`)

- Fetches the demo user specified by `DEMO_USER_ID` environment variable
- Retrieves all scheduled appointments for that user
- Calculates days until each appointment
- Sends reminders for appointments that are:
  - **5 days away** (early reminder)
  - **1 day away** (final reminder)
- Respects user's notification preferences (SMS or WhatsApp)
- Logs all notification attempts to the `notifications` table

#### Preventive Care Reminders (`runPreventiveReminders.js`)

- Fetches the demo user and their `preventive_due_dates` JSON data
- Checks each preventive care item (e.g., flu shot, screening, annual checkup)
- Calculates days until due date
- Sends reminders for items that are:
  - **30 days away** (early reminder)
  - **7 days away** (intermediate reminder)
  - **0 days away** (due today)
- Respects user's notification preferences
- Logs all notification attempts

### Configuration

Before running reminder scripts, ensure:
1. `DEMO_USER_ID` is set in your `.env` file (database ID of the user to send reminders to)
2. User has a valid phone number in the database
3. User has notifications enabled (`notifications_enabled = true`)
4. Twilio credentials are properly configured

### Example Output

```
Running appointment reminders...
User: user@example.com
Checking 2 appointment(s)...
5-day reminder sent: Dr. Smith on Dec 14 2025 at 3 PM (SMS)
Completed: 1 sent, 0 failed

Running preventive reminders...
User: user@example.com
Checking 3 preventive care item(s)...
30-day reminder sent: Flu Shot on Dec 7 2025 (SMS)
Completed: 1 sent, 0 failed
```

## Project Structure

```
DCB-5330-Vertex/
├── elevance-backend/
│   ├── auth/                 # Authentication middleware
│   ├── migrations/           # Database migration files
│   ├── routes/               # API route handlers
│   │   ├── appointments.js
│   │   ├── auth.js
│   │   ├── distances.js
│   │   ├── providers.js
│   │   └── users.js
│   ├── services/             # Business logic services
│   │   ├── reminders/        # Reminder runner scripts
│   │   │   ├── runAppointmentReminders.js
│   │   │   └── runPreventiveReminders.js
│   │   ├── googleCalendarService.js
│   │   ├── notificationService.js
│   │   └── userService.js
│   ├── test_appointment_reminders.js
│   ├── test_preventive_reminders.js
│   ├── server.js             # Express server entry point
│   └── supabaseClient.js     # Database client setup
│
├── elevance-frontend/
│   ├── app/                  # Expo Router pages
│   │   ├── main/             # Main app screens
│   │   │   ├── home.js
│   │   │   ├── find-provider.js
│   │   │   ├── appointments.js
│   │   │   └── profile.js
│   │   └── book/             # Booking flow
│   ├── components/           # Reusable components
│   ├── utils/                # Utility functions
│   └── firebaseConfig.js     # Firebase client config
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `GET /auth/verify` - Verify authentication token

### Users
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/:id` - Get user by ID

### Providers
- `GET /providers` - List all providers
- `GET /providers/:id` - Get provider details
- `GET /providers/:id/slots` - Get provider availability

### Appointments
- `GET /appointments` - Get user's appointments
- `POST /appointments` - Book new appointment
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Cancel appointment

### Distances
- `POST /distances/calculate` - Calculate driving distances


