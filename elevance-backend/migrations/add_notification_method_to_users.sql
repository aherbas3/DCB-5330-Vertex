-- Add notification_method column to users table
-- This column stores the user's preferred notification method: 'SMS' or 'WhatsApp'

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'notification_method'
    ) THEN
        -- Add column with default value (existing rows will automatically get 'SMS')
        ALTER TABLE users 
        ADD COLUMN notification_method VARCHAR(20) DEFAULT 'SMS';
        
        -- Set NOT NULL constraint after adding column with default
        ALTER TABLE users 
        ALTER COLUMN notification_method SET NOT NULL;
        
        -- Add a check constraint to ensure only valid values
        ALTER TABLE users 
        ADD CONSTRAINT check_notification_method 
        CHECK (notification_method IN ('SMS', 'WhatsApp'));
        
        RAISE NOTICE 'Column notification_method added successfully to users table';
    ELSE
        RAISE NOTICE 'Column notification_method already exists in users table';
    END IF;
END $$;

-- Add comment for documentation (outside DO block)
COMMENT ON COLUMN users.notification_method IS 'Preferred notification method: SMS or WhatsApp. Defaults to SMS.';

