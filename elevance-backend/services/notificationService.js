const twilio = require('twilio');
require('dotenv').config();

class NotificationService {
    constructor() {
        this.client = null;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;

        console.log('==================== TWILIO INITIALIZATION ====================');
        console.log('Checking Twilio credentials...');
        console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'NOT SET');
        console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET');
        console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'NOT SET');

        // Initialize Twilio client if credentials are provided
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                this.client = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                console.log('✅ Twilio client initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Twilio client:', error.message);
                this.client = null;
            }
        } else {
            console.warn('⚠️ Twilio credentials not configured. SMS notifications will be disabled.');
        }
        console.log('===============================================================\n');
    }

    async sendAppointmentConfirmation(phoneNumber, appointmentDetails) {
        console.log('\n==================== SENDING APPOINTMENT CONFIRMATION SMS ====================');
        console.log('Twilio Client Status:', this.client ? 'INITIALIZED' : 'NOT INITIALIZED');
        console.log('Recipient Phone:', phoneNumber);
        console.log('Appointment Details:', appointmentDetails);

        if (!this.client) {
            console.log('❌ SMS notifications disabled - Twilio not configured');
            console.log('==================================================================================\n');
            return { success: false, message: 'SMS service not configured' };
        }

        if (!phoneNumber) {
            console.log('❌ No phone number provided');
            console.log('==================================================================================\n');
            return { success: false, message: 'No phone number provided' };
        }

        try {
            const { providerName, date, time } = appointmentDetails;

            const message = `Appointment Confirmed!

Provider: ${providerName}
Date: ${date}
Time: ${time}

You will receive a reminder 24 hours before your appointment. Reply CANCEL to cancel.`;

            console.log('Message to send:');
            console.log(message);
            console.log('---');
            console.log('From Number:', this.fromNumber);
            console.log('To Number:', phoneNumber);
            console.log('Calling Twilio API...');

            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phoneNumber
            });

            console.log('✅ SMS sent successfully!');
            console.log('Message SID:', result.sid);
            console.log('Status:', result.status);
            console.log('To:', result.to);
            console.log('From:', result.from);
            console.log('==================================================================================\n');
            return { success: true, messageSid: result.sid };
        } catch (error) {
            console.error('❌ Failed to send SMS');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
            console.error('Error Status:', error.status);
            console.error('Full Error:', error);
            console.log('==================================================================================\n');
            return { success: false, error: error.message };
        }
    }

    async sendAppointmentReminder(phoneNumber, appointmentDetails) {
        if (!this.client) {
            console.log('SMS notifications disabled - Twilio not configured');
            return { success: false, message: 'SMS service not configured' };
        }

        try {
            const { providerName, date, time } = appointmentDetails;

            const message = `Reminder: You have an appointment tomorrow!

Provider: ${providerName}
Date: ${date}
Time: ${time}

Please arrive 10 minutes early. Reply CANCEL to cancel.`;

            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phoneNumber
            });

            console.log('Reminder SMS sent successfully:', result.sid);
            return { success: true, messageSid: result.sid };
        } catch (error) {
            console.error('Failed to send reminder SMS:', error);
            return { success: false, error: error.message };
        }
    }

    async sendAppointmentCancellation(phoneNumber, appointmentDetails) {
        if (!this.client) {
            console.log('SMS notifications disabled - Twilio not configured');
            return { success: false, message: 'SMS service not configured' };
        }

        try {
            const { providerName, date, time } = appointmentDetails;

            const message = `Appointment Cancelled

Your appointment has been cancelled:
Provider: ${providerName}
Date: ${date}
Time: ${time}

To reschedule, please visit the app or contact us.`;

            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phoneNumber
            });

            console.log('Cancellation SMS sent successfully:', result.sid);
            return { success: true, messageSid: result.sid };
        } catch (error) {
            console.error('Failed to send cancellation SMS:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new NotificationService();
