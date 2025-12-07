const twilio = require('twilio');
const axios = require('axios');
const { supabase } = require('../supabaseClient');
require('dotenv').config();

class NotificationService {
    constructor() {
        this.client = null;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
        // WhatsApp sender - can be Twilio sandbox number or your WhatsApp-enabled number
        // Format: whatsapp:+14155238886 (sandbox) or whatsapp:+1YOURNUMBER
        this.whatsappFromNumber = process.env.TWILIO_WHATSAPP_NUMBER || (this.fromNumber ? `whatsapp:${this.fromNumber}` : null);

        console.log('==================== TWILIO INITIALIZATION ====================');
        console.log('Checking Twilio credentials...');
        console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'NOT SET');
        console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET');
        console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'NOT SET');
        console.log('TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER || (this.whatsappFromNumber ? 'Using phone number format' : 'NOT SET'));

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

    /**
     * Shorten URL using TinyURL
     * @param {string} longUrl - The URL to shorten
     * @returns {Promise<string>} Shortened URL or original URL if shortening fails
     */
    async shortenUrl(longUrl) {
        if (!longUrl) return null;
        
        try {
            const tinyUrlApi = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
            const response = await axios.get(tinyUrlApi);
            const shortUrl = response.data.trim();
            
            // TinyURL returns the shortened URL as plain text, or "Error" if it fails
            if (shortUrl && !shortUrl.includes('Error') && shortUrl.startsWith('http')) {
                console.log('🔗 URL shortened:', shortUrl);
                return shortUrl;
            } else {
                console.warn('⚠️ URL shortening failed, using original URL');
                return longUrl;
            }
        } catch (error) {
            console.error('⚠️ Error shortening URL:', error.message);
            // Return original URL if shortening fails
            return longUrl;
        }
    }

    /**
     * Format phone number to E.164 format for Twilio
     * Converts ###-###-#### format to +1##########
     * @param {string} phoneNumber - Phone number in various formats
     * @returns {string} Phone number in E.164 format (+1##########)
     */
    formatPhoneNumberForTwilio(phoneNumber) {
        if (!phoneNumber) {
            return null;
        }

        // Remove all non-digit characters
        const digitsOnly = phoneNumber.replace(/\D/g, '');

        // If already in E.164 format (starts with country code), return as is
        if (phoneNumber.trim().startsWith('+')) {
            return phoneNumber.trim();
        }

        // If it's 10 digits (###-###-#### or ##########), add +1
        if (digitsOnly.length === 10) {
            return `+1${digitsOnly}`;
        }

        // If it's 11 digits and starts with 1, add +
        if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
            return `+${digitsOnly}`;
        }

        // If it's already 12 characters with +1, return as is
        if (digitsOnly.length === 11 && phoneNumber.includes('+')) {
            return phoneNumber.trim();
        }

        // Default: try to format as +1##########
        console.warn(`⚠️ Unexpected phone number format: ${phoneNumber}, attempting to format...`);
        if (digitsOnly.length >= 10) {
            // Take last 10 digits and add +1
            const lastTenDigits = digitsOnly.slice(-10);
            return `+1${lastTenDigits}`;
        }

        // If we can't format it, return original (Twilio will handle validation)
        console.warn(`⚠️ Could not format phone number: ${phoneNumber}, using as-is`);
        return phoneNumber.trim();
    }

    /**
     * Log notification to database
     * @param {string} userId - Database user ID (UUID)
     * @param {string} channel - 'sms' or 'whatsapp'
     * @param {string} type - Notification type (e.g., 'appointment_confirmation')
     * @param {string} body - Message body that was sent
     * @param {string} status - 'sent' or 'failed'
     * @param {string|null} errorMessage - Error message if failed, null if successful
     * @returns {Promise<void>}
     */
    async logNotification(userId, channel, type, body, status, errorMessage = null) {
        if (!userId) {
            console.warn('⚠️ Cannot log notification: userId is required');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    channel: channel.toLowerCase(), // Ensure lowercase: 'sms' or 'whatsapp'
                    type: type,
                    body: body,
                    status: status, // 'sent' or 'failed'
                    error_message: errorMessage
                })
                .select()
                .single();

            if (error) {
                console.error('⚠️ Failed to log notification to database:', error);
            } else {
                console.log(`📝 Notification logged: ${channel} ${type} - ${status} (ID: ${data.id})`);
            }
        } catch (error) {
            // Don't throw - logging failures shouldn't break notifications
            console.error('⚠️ Error logging notification:', error.message);
        }
    }

    /**
     * Build the appointment confirmation message
     * @param {Object} appointmentDetails - Appointment details
     * @returns {Promise<string>} Formatted message
     */
    async buildAppointmentMessage(appointmentDetails) {
        const { providerName, date, location, googleCalendarUrl } = appointmentDetails;

        // Shorten the calendar URL if provided
        let shortenedCalendarUrl = googleCalendarUrl;
        if (googleCalendarUrl) {
            shortenedCalendarUrl = await this.shortenUrl(googleCalendarUrl);
        }

        // Build compact message format
        // Format: "Appt confirmed: Provider 2, Dec 8 3 PM at Elevance Health's Midtown Clinic. Add to calendar: https://tinyurl.com/xyz123"
        let message = `Appt confirmed: ${providerName}, ${date} at ${location}`;
        
        // Add calendar link if provided
        if (shortenedCalendarUrl) {
            message += `. Add to calendar: ${shortenedCalendarUrl}`;
        }

        return message;
    }

    /**
     * Send appointment confirmation via SMS
     * @param {string} phoneNumber - Recipient phone number
     * @param {Object} appointmentDetails - Appointment details
     * @param {string} userId - Database user ID (UUID) for logging
     * @returns {Promise<Object>} Result object with success status and message body
     */
    async sendAppointmentConfirmationSMS(phoneNumber, appointmentDetails, userId = null) {
        console.log('\n==================== SENDING APPOINTMENT CONFIRMATION SMS ====================');
        console.log('Twilio Client Status:', this.client ? 'INITIALIZED' : 'NOT INITIALIZED');
        console.log('Recipient Phone (original):', phoneNumber);

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

        // Format phone number to E.164 format for Twilio
        const formattedPhoneNumber = this.formatPhoneNumberForTwilio(phoneNumber);
        console.log('Recipient Phone (formatted):', formattedPhoneNumber);

        try {
            const message = await this.buildAppointmentMessage(appointmentDetails);

            console.log('Message to send:');
            console.log(message);
            console.log('---');
            console.log('From Number:', this.fromNumber);
            console.log('To Number (formatted):', formattedPhoneNumber);
            console.log('Calling Twilio API...');

            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: formattedPhoneNumber
            });

            console.log('✅ SMS sent successfully!');
            console.log('Message SID:', result.sid);
            console.log('Status:', result.status);
            console.log('To:', result.to);
            console.log('From:', result.from);
            console.log('==================================================================================\n');
            
            // Log successful notification
            if (userId) {
                await this.logNotification(
                    userId,
                    'sms',
                    'appointment_confirmation',
                    message,
                    'sent',
                    null
                );
            }
            
            return { success: true, messageSid: result.sid, messageBody: message };
        } catch (error) {
            console.error('❌ Failed to send SMS');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
            console.error('Error Status:', error.status);
            console.error('Full Error:', error);
            console.log('==================================================================================\n');
            
            // Build message for logging (even if sending failed)
            const messageBody = await this.buildAppointmentMessage(appointmentDetails).catch(() => 'Message build failed');
            
            // Log failed notification
            if (userId) {
                await this.logNotification(
                    userId,
                    'sms',
                    'appointment_confirmation',
                    messageBody,
                    'failed',
                    error.message || 'Unknown error'
                );
            }
            
            return { success: false, error: error.message, messageBody: messageBody };
        }
    }

    /**
     * Send appointment confirmation via WhatsApp
     * @param {string} phoneNumber - Recipient phone number
     * @param {Object} appointmentDetails - Appointment details
     * @param {string} userId - Database user ID (UUID) for logging
     * @returns {Promise<Object>} Result object with success status and message body
     */
    async sendAppointmentConfirmationWhatsApp(phoneNumber, appointmentDetails, userId = null) {
        console.log('\n==================== SENDING APPOINTMENT CONFIRMATION VIA WHATSAPP ====================');
        console.log('Twilio Client Status:', this.client ? 'INITIALIZED' : 'NOT INITIALIZED');
        console.log('Recipient Phone (original):', phoneNumber);

        if (!this.client) {
            console.log('❌ WhatsApp notifications disabled - Twilio not configured');
            console.log('==================================================================================\n');
            return { success: false, message: 'WhatsApp service not configured' };
        }

        if (!phoneNumber) {
            console.log('❌ No phone number provided');
            console.log('==================================================================================\n');
            return { success: false, message: 'No phone number provided' };
        }

        if (!this.whatsappFromNumber) {
            console.log('❌ WhatsApp sender number not configured');
            console.log('==================================================================================\n');
            return { success: false, message: 'WhatsApp sender number not configured' };
        }

        // Format phone number to E.164 format and add whatsapp: prefix
        const formattedPhoneNumber = this.formatPhoneNumberForTwilio(phoneNumber);
        const whatsappToNumber = `whatsapp:${formattedPhoneNumber}`;
        console.log('Recipient Phone (formatted for WhatsApp):', whatsappToNumber);

        try {
            const message = await this.buildAppointmentMessage(appointmentDetails);

            console.log('Message to send:');
            console.log(message);
            console.log('---');
            console.log('From Number (WhatsApp):', this.whatsappFromNumber);
            console.log('To Number (WhatsApp):', whatsappToNumber);
            console.log('Calling Twilio WhatsApp API...');

            const result = await this.client.messages.create({
                body: message,
                from: this.whatsappFromNumber,
                to: whatsappToNumber
            });

            console.log('✅ WhatsApp message sent successfully!');
            console.log('Message SID:', result.sid);
            console.log('Status:', result.status);
            console.log('To:', result.to);
            console.log('From:', result.from);
            console.log('==================================================================================\n');
            
            // Log successful notification
            if (userId) {
                await this.logNotification(
                    userId,
                    'whatsapp',
                    'appointment_confirmation',
                    message,
                    'sent',
                    null
                );
            }
            
            return { success: true, messageSid: result.sid, messageBody: message };
        } catch (error) {
            console.error('❌ Failed to send WhatsApp message');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
            console.error('Error Status:', error.status);
            console.error('Full Error:', error);
            console.log('==================================================================================\n');
            
            // Build message for logging (even if sending failed)
            const messageBody = await this.buildAppointmentMessage(appointmentDetails).catch(() => 'Message build failed');
            
            // Log failed notification
            if (userId) {
                await this.logNotification(
                    userId,
                    'whatsapp',
                    'appointment_confirmation',
                    messageBody,
                    'failed',
                    error.message || 'Unknown error'
                );
            }
            
            return { success: false, error: error.message, messageBody: messageBody };
        }
    }

    /**
     * Send appointment confirmation via user's preferred method (SMS or WhatsApp)
     * @param {string} phoneNumber - Recipient phone number
     * @param {Object} appointmentDetails - Appointment details
     * @param {string} notificationMethod - 'SMS' or 'WhatsApp'
     * @param {string} userId - Database user ID (UUID) for logging
     * @returns {Promise<Object>} Result object with success status
     */
    async sendAppointmentConfirmation(phoneNumber, appointmentDetails, notificationMethod = 'SMS', userId = null) {
        console.log('📱 Notification method:', notificationMethod);
        
        if (notificationMethod === 'WhatsApp') {
            return await this.sendAppointmentConfirmationWhatsApp(phoneNumber, appointmentDetails, userId);
        } else {
            // Default to SMS
            return await this.sendAppointmentConfirmationSMS(phoneNumber, appointmentDetails, userId);
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
