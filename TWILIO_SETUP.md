# Twilio SMS Notifications Setup

This guide explains how to set up Twilio SMS notifications for appointment confirmations and cancellations.

## Features

- **Appointment Confirmation**: Users receive an SMS when they book an appointment
- **Appointment Cancellation**: Users receive an SMS when they cancel an appointment
- **Appointment Reminders**: Service includes a method for sending 24-hour reminders (can be triggered via cron job)

## Setup Steps

### 1. Create a Twilio Account

1. Go to [Twilio.com](https://www.twilio.com)
2. Sign up for a free account
3. You'll get $15 in free credit

### 2. Get Your Twilio Credentials

1. Go to your [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Get a phone number:
   - Go to **Phone Numbers** → **Manage** → **Buy a number**
   - Choose a number (free trial accounts get one free number)
   - Make sure it has **SMS** capability

### 3. Configure Backend

Update `/elevance-backend/.env` with your Twilio credentials:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Restart Backend Server

```bash
cd elevance-backend
npm start
```

## How It Works

### Appointment Booking Flow

1. User books appointment via web/mobile app
2. Backend creates appointment in database
3. Backend fetches user's phone number from `users` table
4. Backend fetches provider name from `providers` table
5. SMS is sent via Twilio with appointment details

### SMS Message Format

**Confirmation:**
```
Appointment Confirmed!

Provider: Dr. Smith
Date: Monday, November 17, 2025
Time: 7:00 PM

You will receive a reminder 24 hours before your appointment. Reply CANCEL to cancel.
```

**Cancellation:**
```
Appointment Cancelled

Your appointment has been cancelled:
Provider: Dr. Smith
Date: Monday, November 17, 2025
Time: 7:00 PM

To reschedule, please visit the app or contact us.
```

## Important Notes

### Free Trial Limitations

- Twilio free trial accounts can only send SMS to **verified phone numbers**
- To verify a number: Go to Twilio Console → **Phone Numbers** → **Verified Caller IDs**
- All messages will include "Sent from your Twilio trial account" prefix
- Upgrade to a paid account to remove these limitations

### Phone Number Format

Phone numbers in the database must be in E.164 format:
- Format: `+[country code][number]`
- Example: `+12125551234` (US number)
- Example: `+447911123456` (UK number)

### Graceful Degradation

If Twilio credentials are not configured:
- The app will still work normally
- SMS notifications will be skipped
- A warning will be logged: "Twilio credentials not configured"

## Testing

### Test with Verified Number (Free Trial)

1. Add your phone number as a verified caller ID in Twilio
2. Update your user in the database:
   ```sql
   UPDATE users
   SET phone_number = '+12125551234'  -- Your verified number
   WHERE email = 'your-email@example.com';
   ```
3. Book an appointment
4. Check for SMS on your phone

### Check Logs

Monitor the backend logs for SMS status:
```bash
cd elevance-backend
npm start
# Look for: "SMS sent successfully: SMxxxxx..."
```

## Troubleshooting

### SMS Not Received

1. **Check phone number format**: Must be E.164 format (+12125551234)
2. **Verify trial account**: Number must be verified in Twilio console
3. **Check backend logs**: Look for error messages
4. **Verify credentials**: Ensure .env has correct Account SID and Auth Token

### Error: "The number +X is unverified"

- This is expected on free trial accounts
- Add the number as a verified caller ID in Twilio console
- Or upgrade to a paid account

### Error: "Unable to create record: The 'From' number is not a valid phone number"

- Check that `TWILIO_PHONE_NUMBER` in .env matches your Twilio number exactly
- Include the + and country code

## Future Enhancements

### Automated Reminders

Create a cron job to send 24-hour reminders:

```javascript
// Example cron job (not included in current setup)
const cron = require('node-cron');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
    // Get tomorrow's appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch appointments and send reminders
    // notificationService.sendAppointmentReminder(...)
});
```

### Two-Way SMS

Enable users to cancel appointments via SMS reply:
- Set up Twilio webhook for incoming messages
- Parse message for "CANCEL" keyword
- Look up and cancel appointment

## Cost

- **Free Trial**: $15 credit, ~500 SMS messages
- **Paid Account**:
  - Phone number: $1/month
  - SMS: $0.0075 per message (US)
  - Example: 1000 SMS/month = ~$8.50/month

## Resources

- [Twilio Node.js SDK Docs](https://www.twilio.com/docs/sms/quickstart/node)
- [Twilio Console](https://console.twilio.com/)
- [E.164 Phone Number Format](https://www.twilio.com/docs/glossary/what-e164)
