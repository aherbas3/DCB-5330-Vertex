-- Provider Availability Slots Table
CREATE TABLE IF NOT EXISTS provider_slots (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 60, -- How long each appointment slot is
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure no overlapping slots for same provider on same day
    CONSTRAINT no_overlap EXCLUDE USING gist (
        provider_id WITH =,
        day_of_week WITH =,
        tsrange(start_time::time::text::timestamp, end_time::time::text::timestamp) WITH &&
    )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_provider_slots_provider_day
ON provider_slots(provider_id, day_of_week);

-- RLS Policies
ALTER TABLE provider_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can view available slots
CREATE POLICY "Anyone can view available slots"
ON provider_slots FOR SELECT
USING (is_available = true);

-- Only admins can modify slots (you can adjust this later)
CREATE POLICY "Admins can manage slots"
ON provider_slots FOR ALL
USING (true); -- For now, allow all - you can restrict later

-- Insert sample slots for existing providers
-- Monday-Friday, 9 AM - 5 PM, 1-hour slots
INSERT INTO provider_slots (provider_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT
    p.id,
    dow,
    '09:00:00'::time,
    '17:00:00'::time,
    60
FROM providers p
CROSS JOIN generate_series(1, 5) AS dow -- Monday to Friday
ON CONFLICT DO NOTHING;

-- Add Saturday morning hours for some providers (optional)
INSERT INTO provider_slots (provider_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT
    p.id,
    6, -- Saturday
    '09:00:00'::time,
    '13:00:00'::time,
    60
FROM providers p
WHERE p.id % 2 = 0 -- Every other provider has Saturday hours
ON CONFLICT DO NOTHING;
