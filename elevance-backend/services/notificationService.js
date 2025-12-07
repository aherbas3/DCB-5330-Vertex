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

        // Initialize Twilio client if credentials are provided
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                this.client = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
            } catch (error) {
                console.error('Failed to initialize Twilio client:', error.message);
                this.client = null;
            }
        }
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
                // URL shortened successfully
                return shortUrl;
            } else {
                console.warn('URL shortening failed, using original URL');
                return longUrl;
            }
        } catch (error) {
            console.error('Error shortening URL:', error.message);
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
        console.warn(`Unexpected phone number format: ${phoneNumber}, attempting to format...`);
        if (digitsOnly.length >= 10) {
            // Take last 10 digits and add +1
            const lastTenDigits = digitsOnly.slice(-10);
            return `+1${lastTenDigits}`;
        }

        // If we can't format it, return original (Twilio will handle validation)
        console.warn(`Could not format phone number: ${phoneNumber}, using as-is`);
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
            console.warn('Cannot log notification: userId is required');
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
                console.error('Failed to log notification to database:', error);
            }
        } catch (error) {
            // Don't throw - logging failures shouldn't break notifications
            console.error('Error logging notification:', error.message);
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
            console.log(' SMS notifications disabled - Twilio not configured');
            console.log('==================================================================================\n');
            return { success: false, message: 'SMS service not configured' };
        }

        if (!phoneNumber) {
            console.log(' No phone number provided');
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

            console.log(' SMS sent successfully!');
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
            console.error(' Failed to send SMS');
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
            console.log(' WhatsApp notifications disabled - Twilio not configured');
            console.log('==================================================================================\n');
            return { success: false, message: 'WhatsApp service not configured' };
        }

        if (!phoneNumber) {
            console.log(' No phone number provided');
            console.log('==================================================================================\n');
            return { success: false, message: 'No phone number provided' };
        }

        if (!this.whatsappFromNumber) {
            console.log(' WhatsApp sender number not configured');
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

            console.log(' WhatsApp message sent successfully!');
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
            console.error(' Failed to send WhatsApp message');
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
        console.log(' Notification method:', notificationMethod);
        
        if (notificationMethod === 'WhatsApp') {
            return await this.sendAppointmentConfirmationWhatsApp(phoneNumber, appointmentDetails, userId);
        } else {
            // Default to SMS
            return await this.sendAppointmentConfirmationSMS(phoneNumber, appointmentDetails, userId);
        }
    }

    /**
     * Build a compact reminder message for appointments
     * @param {Object} appointmentDetails - Appointment details with providerName, date, and time
     * @returns {string} Compact reminder message
     */
    buildReminderMessage(appointmentDetails) {
        const { providerName, date, time } = appointmentDetails;
        
        // Build compact format: "Reminder: Appointment with {providerName} on {date} at {time}."
        // If date already includes time (e.g., "Dec 8 3 PM"), use format "on {date}"
        // Otherwise use format "on {date} at {time}"
        let message;
        if (time && !date.includes(time)) {
            // Date and time are separate (e.g., date="Dec 8 2025", time="3 PM")
            message = `Reminder: Appointment with ${providerName} on ${date} at ${time}.`;
        } else {
            // Date already includes time or time is not provided (e.g., date="Dec 8 3 PM")
            message = `Reminder: Appointment with ${providerName} on ${date}.`;
        }
        
        return message;
    }

    /**
     * Send appointment reminder via SMS or WhatsApp
     * @param {string} phoneNumber - Recipient phone number
     * @param {Object} appointmentDetails - Appointment details with providerName, date, and time
     * @param {string} notificationMethod - 'SMS' or 'WhatsApp' (default: 'SMS')
     * @param {string|number} userId - Database user ID for logging (optional)
     * @returns {Promise<Object>} Result object with success status and message body
     */
    async sendAppointmentReminder(phoneNumber, appointmentDetails, notificationMethod = 'SMS', userId = null) {
        // Check that Twilio client exists
        if (!this.client) {
            return { success: false, message: 'Notification service not configured', messageBody: null };
        }

        // Validate phone number
        if (!phoneNumber) {
            return { success: false, message: 'No phone number provided', messageBody: null };
        }

        // Format phone number to E.164 format
        const formattedPhoneNumber = this.formatPhoneNumberForTwilio(phoneNumber);

        // Determine channel for logging
        const channel = notificationMethod === 'WhatsApp' ? 'whatsapp' : 'sms';

        // Build reminder message
        let messageBody;
        try {
            messageBody = this.buildReminderMessage(appointmentDetails);
        } catch (error) {
            console.error('Failed to build reminder message:', error.message);
            messageBody = 'Reminder: Appointment reminder message build failed.';
        }

        try {
            let fromNumber;
            let toNumber;

            if (notificationMethod === 'WhatsApp') {
                // WhatsApp configuration
                if (!this.whatsappFromNumber) {
                    // Log failed attempt
                    if (userId) {
                        await this.logNotification(
                            userId,
                            'whatsapp',
                            'appointment_reminder',
                            messageBody,
                            'failed',
                            'WhatsApp sender number not configured'
                        );
                    }
                    
                    return { success: false, error: 'WhatsApp sender number not configured', messageBody: messageBody };
                }

                fromNumber = this.whatsappFromNumber;
                toNumber = `whatsapp:${formattedPhoneNumber}`;
            } else {
                // SMS configuration (default)
                fromNumber = this.fromNumber;
                toNumber = formattedPhoneNumber;
            }

            const result = await this.client.messages.create({
                body: messageBody,
                from: fromNumber,
                to: toNumber
            });

            // Log successful notification
            if (userId) {
                await this.logNotification(
                    userId,
                    channel,
                    'appointment_reminder',
                    messageBody,
                    'sent',
                    null
                );
            }

            return { success: true, messageSid: result.sid, messageBody: messageBody };
        } catch (error) {
            console.error(`Failed to send reminder (${error.code}): ${error.message}`);

            // Log failed notification
            if (userId) {
                await this.logNotification(
                    userId,
                    channel,
                    'appointment_reminder',
                    messageBody || 'Message build failed',
                    'failed',
                    error.message || 'Unknown error'
                );
            }

            return { 
                success: false, 
                error: error.message, 
                messageBody: messageBody || 'Message build failed' 
            };
        }
    }

    /**
     * Build a compact reminder message for preventive care
     * @param {Object} preventiveDetails - Preventive care details with type and dueDate
     * @returns {string} Compact preventive reminder message
     */
    buildPreventiveReminderMessage(preventiveDetails) {
        const { type, dueDate } = preventiveDetails;
        
        // Normalize type to lowercase for consistent mapping
        const normalizedType = (type || '').toLowerCase();
        
        // Map common types to friendly labels
        const typeMap = {
            'flu_shot': 'flu shot',
            'annual_checkup': 'annual checkup',
            'screening': 'screening'
        };
        
        // Get friendly label or fallback to replacing underscores with spaces
        let label = typeMap[normalizedType];
        if (!label) {
            // If type is missing, use default
            if (!type) {
                label = 'preventive care';
            } else {
                // Fallback: replace underscores with spaces (e.g., covid_booster → covid booster)
                label = type.replace(/_/g, ' ');
            }
        }
        
        // Build message: "Reminder: You're due for your {label} on {dueDate}."
        return `Reminder: You're due for your ${label} on ${dueDate}.`;
    }

    /**
     * Send preventive care reminder via SMS or WhatsApp
     * @param {string} phoneNumber - Recipient phone number
     * @param {Object} preventiveDetails - Preventive care details with type and dueDate
     * @param {string} notificationMethod - 'SMS' or 'WhatsApp' (default: 'SMS')
     * @param {string|number} userId - Database user ID for logging (optional)
     * @returns {Promise<Object>} Result object with success status and message body
     */
    async sendPreventiveReminder(phoneNumber, preventiveDetails, notificationMethod = 'SMS', userId = null) {
        // Check that Twilio client exists
        if (!this.client) {
            return { success: false, message: 'Notification service not configured', messageBody: null };
        }

        // Validate phone number
        if (!phoneNumber) {
            return { success: false, message: 'No phone number provided', messageBody: null };
        }

        // Validate preventive details
        if (!preventiveDetails || !preventiveDetails.dueDate) {
            return { success: false, message: 'Missing or invalid preventive details', messageBody: null };
        }

        // Format phone number to E.164 format
        const formattedPhoneNumber = this.formatPhoneNumberForTwilio(phoneNumber);

        // Determine channel for logging
        const channel = notificationMethod === 'WhatsApp' ? 'whatsapp' : 'sms';

        // Build reminder message
        let messageBody;
        try {
            messageBody = this.buildPreventiveReminderMessage(preventiveDetails);
        } catch (error) {
            console.error('Failed to build preventive reminder message:', error.message);
            messageBody = 'Reminder: Preventive care reminder message build failed.';
        }

        try {
            let fromNumber;
            let toNumber;

            if (notificationMethod === 'WhatsApp') {
                // WhatsApp configuration
                if (!this.whatsappFromNumber) {
                    // Log failed attempt
                    if (userId) {
                        await this.logNotification(
                            userId,
                            'whatsapp',
                            'preventive_reminder',
                            messageBody,
                            'failed',
                            'WhatsApp sender number not configured'
                        );
                    }
                    
                    return { success: false, error: 'WhatsApp sender number not configured', messageBody: messageBody };
                }

                fromNumber = this.whatsappFromNumber;
                toNumber = `whatsapp:${formattedPhoneNumber}`;
            } else {
                // SMS configuration (default)
                fromNumber = this.fromNumber;
                toNumber = formattedPhoneNumber;
            }

            const result = await this.client.messages.create({
                body: messageBody,
                from: fromNumber,
                to: toNumber
            });

            // Log successful notification
            if (userId) {
                await this.logNotification(
                    userId,
                    channel,
                    'preventive_reminder',
                    messageBody,
                    'sent',
                    null
                );
            }

            return { success: true, messageSid: result.sid, messageBody: messageBody };
        } catch (error) {
            console.error(`Failed to send preventive reminder (${error.code}): ${error.message}`);

            // Log failed notification
            if (userId) {
                await this.logNotification(
                    userId,
                    channel,
                    'preventive_reminder',
                    messageBody || 'Message build failed',
                    'failed',
                    error.message || 'Unknown error'
                );
            }

            return { 
                success: false, 
                error: error.message, 
                messageBody: messageBody || 'Message build failed' 
            };
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
