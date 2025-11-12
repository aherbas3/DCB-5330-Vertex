# Setup Instructions

## 🗄️ **Database Setup (Run in Supabase SQL Editor)**

### 1. Add firebase_uid to users table
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
```

### 2. Create provider_slots table
```sql
-- Provider Availability Slots Table
CREATE TABLE IF NOT EXISTS provider_slots (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 60,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_slots_provider_day
ON provider_slots(provider_id, day_of_week);

ALTER TABLE provider_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available slots"
ON provider_slots FOR SELECT
USING (is_available = true);

-- Insert sample slots (Monday-Friday, 9 AM - 5 PM)
INSERT INTO provider_slots (provider_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT
    p.id,
    dow,
    '09:00:00'::time,
    '17:00:00'::time,
    60
FROM providers p
CROSS JOIN generate_series(1, 5) AS dow
ON CONFLICT DO NOTHING;
```

## 🚀 **Running the Application**

### Backend
```bash
cd elevance-backend
node server.js
```

### Frontend
```bash
cd elevance-frontend
npm run web
```

## ✅ **What's Fixed**

### Find Provider Page
- ✅ All filters always visible (no collapsible)
- ✅ Sidebar layout with filters on left
- ✅ Map/List view toggle in filters
- ✅ Map now shows providers with PostGIS lat/lon extraction
- ✅ Debug logging to console for map issues

### Provider Booking Flow
- ✅ Backend: `/providers/:id/slots` endpoint
- ✅ Fetches real time slots from `provider_slots` table
- ✅ Filters out already-booked appointments
- ✅ Generates next 14 days of available slots
- ✅ providers/[id].js uses real slots from DB

### Architecture
**Appointment Booking:**
1. User browses providers → filters client-side
2. Click provider → see details + available slots (from DB)
3. Click slot → goes to booking confirmation
4. Confirm → creates row in `appointments` table
5. Slot becomes unavailable for other users

**Tables:**
- `users` - User profiles (linked by firebase_uid)
- `providers` - Healthcare providers
- `provider_slots` - Recurring availability (Mon-Fri 9-5, etc.)
- `appointments` - Booked appointments (links users + providers + times)

## 🐛 **Debugging Map Issues**

If map is still blank:
1. Open browser console
2. Look for log: `Provider for map: [id] [name] [lat] [lon]`
3. If lat/lon are null:
   - Check providers table has location data (PostGIS geometry)
   - Run: `SELECT id, name, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon FROM providers;`

## 📝 **Next Steps**

If you need to:
- **Add more provider slots**: Insert rows into `provider_slots` table
- **Change slot duration**: Update `slot_duration_minutes` column
- **Block specific dates**: Add to appointments with status='blocked'
- **Add provider photos**: Add `photo_url` column to providers table
