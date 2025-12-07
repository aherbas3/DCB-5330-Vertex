-- Add preventive_due_dates column to users table
-- This column stores preventive care due dates as a JSONB object

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'preventive_due_dates'
    ) THEN
        -- Add column with default value (existing rows will automatically get '{}')
        ALTER TABLE users 
        ADD COLUMN preventive_due_dates JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Column preventive_due_dates added successfully to users table';
    ELSE
        RAISE NOTICE 'Column preventive_due_dates already exists in users table';
    END IF;
END $$;

-- Add comment for documentation (outside DO block)
COMMENT ON COLUMN users.preventive_due_dates IS 
'Preventive care due dates stored as JSONB object. Expected format: {"flu_shot": "2025-12-14", "annual_checkup": "2026-01-05", "screening": "2025-12-20"}. Keys are preventive care type names, values are ISO date strings (YYYY-MM-DD). Defaults to empty object {}.';

