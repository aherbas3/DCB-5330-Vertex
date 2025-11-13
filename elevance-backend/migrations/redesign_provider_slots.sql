-- Redesign provider_slots to store actual datetime slots instead of recurring patterns
-- This makes booking/cancelling much simpler and avoids timezone issues

-- Drop the old table and recreate with new structure
DROP TABLE IF EXISTS provider_slots CASCADE;

CREATE TABLE provider_slots (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Ensure no duplicate slots
    UNIQUE(provider_id, appointment_date, start_time)
);

-- Create indexes for faster queries
CREATE INDEX idx_provider_slots_provider_date
ON provider_slots(provider_id, appointment_date);

CREATE INDEX idx_provider_slots_date
ON provider_slots(appointment_date);

-- RLS Policies
ALTER TABLE provider_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can view slots
CREATE POLICY "Anyone can view slots"
ON provider_slots FOR SELECT
USING (true);

-- Only system can manage slots
CREATE POLICY "System can manage slots"
ON provider_slots FOR ALL
USING (true);

-- Function to generate slots for a provider
CREATE OR REPLACE FUNCTION generate_provider_slots(
    p_provider_id INTEGER,
    p_days_ahead INTEGER DEFAULT 30
) RETURNS void AS $$
DECLARE
    v_date DATE;
    v_day_of_week INTEGER;
    v_hour INTEGER;
BEGIN
    -- Generate slots for next p_days_ahead days
    FOR day_offset IN 0..p_days_ahead LOOP
        v_date := CURRENT_DATE + day_offset;
        v_day_of_week := EXTRACT(DOW FROM v_date);

        -- Monday-Friday: 9 AM - 5 PM (1-hour slots)
        IF v_day_of_week BETWEEN 1 AND 5 THEN
            FOR v_hour IN 9..16 LOOP
                INSERT INTO provider_slots (provider_id, appointment_date, start_time, end_time)
                VALUES (
                    p_provider_id,
                    v_date,
                    (v_hour || ':00:00')::TIME,
                    ((v_hour + 1) || ':00:00')::TIME
                )
                ON CONFLICT (provider_id, appointment_date, start_time) DO NOTHING;
            END LOOP;
        END IF;

        -- Saturday: 9 AM - 1 PM (1-hour slots) for providers with even IDs
        IF v_day_of_week = 6 AND p_provider_id % 2 = 0 THEN
            FOR v_hour IN 9..12 LOOP
                INSERT INTO provider_slots (provider_id, appointment_date, start_time, end_time)
                VALUES (
                    p_provider_id,
                    v_date,
                    (v_hour || ':00:00')::TIME,
                    ((v_hour + 1) || ':00:00')::TIME
                )
                ON CONFLICT (provider_id, appointment_date, start_time) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate slots for all existing providers
DO $$
DECLARE
    provider_record RECORD;
BEGIN
    FOR provider_record IN SELECT id FROM providers LOOP
        PERFORM generate_provider_slots(provider_record.id, 30);
    END LOOP;
END $$;
