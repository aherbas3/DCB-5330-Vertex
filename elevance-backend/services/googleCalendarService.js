/**
 * Email Notification Service
 * Sends appointment confirmation emails with "Add to Calendar" links
 */

const { Resend } = require("resend");
require('dotenv').config();

class EmailNotificationService {
    constructor() {
        console.log('==================== EMAIL NOTIFICATION INITIALIZATION ====================');
        console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY_GMAIL ? 'SET (hidden)' : 'NOT SET');

        // Initialize Resend
        if (process.env.RESEND_API_KEY_GMAIL) {
            this.resend = new Resend(process.env.RESEND_API_KEY_GMAIL);
            console.log('✅ Resend initialized successfully');
        } else {
            console.warn('⚠️ Resend API key not configured. Email notifications will be disabled.');
            this.resend = null;
        }

        console.log('==========================================================================\n');
    }


    /**
     * Send email via Resend
     */
    async sendEmail({ to, subject, html }) {
        console.log('\n==================== SENDING EMAIL ====================');
        console.log('To:', to);
        console.log('Subject:', subject);

        if (!this.resend) {
            console.log('❌ Resend not configured');
            console.log('======================================================\n');
            return { success: false, message: 'Resend not configured' };
        }

        try {
            // Hardcode recipient email for now
            const recipientEmail = process.env.RECEIVER_GMAIL;

            console.log('Sending email via Resend...');
            console.log('From:', process.env.SENDER_EMAIL || 'onboarding@resend.dev');
            console.log('To:', recipientEmail);

            const { data, error } = await this.resend.emails.send({
                from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
                to: recipientEmail,
                subject,
                html,
            });

            if (error) {
                console.error('❌ Resend API returned error:', error);
                console.log('======================================================\n');
                return { success: false, error: error.message || error };
            }

            console.log('✅ Email sent successfully!');
            console.log('Email ID:', data.id);
            console.log('Full response:', data);
            console.log('======================================================\n');
            return { success: true, emailId: data.id };
        } catch (error) {
            console.error('❌ Failed to send email');
            console.error('Error:', error);
            console.error('Error message:', error.message);
            console.log('======================================================\n');
            return { success: false, error: error.message };
        }
    }

    /**
     * Send appointment confirmation email
     */
    async sendAppointmentConfirmation(userEmail, appointmentDetails) {
        console.log('\n==================== SENDING APPOINTMENT CONFIRMATION ====================');
        console.log('User Email:', userEmail);
        console.log('Appointment Details:', appointmentDetails);

        const { providerName, date, time } = appointmentDetails;

        // Send Email
        const html = `
            <h2>Appointment Confirmed!</h2>
            <p><strong>Provider:</strong> ${providerName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>

            <p style="margin-top: 20px; padding: 15px; background-color: #e3f2fd; border-left: 4px solid #2196f3; color: #1565c0;">
                💡 <strong>Don't forget to add this appointment to your calendar!</strong><br>
                You can add it to Google Calendar from your appointments page in the app.
            </p>
        `;

        const emailResult = await this.sendEmail({
            to: userEmail,
            subject: 'Appointment Confirmation',
            html,
        });

        console.log('=========================================================================\n');

        return {
            success: emailResult.success,
            emailResult,
        };
    }

    /**
     * Send appointment reminder (still useful for additional reminders)
     */
    async sendAppointmentReminder(userEmail, appointmentDetails) {
        console.log('\n==================== SENDING APPOINTMENT REMINDER ====================');

        const { providerName, date, time } = appointmentDetails;

        const html = `
            <h2>Reminder: You have an appointment tomorrow!</h2>
            <p><strong>Provider:</strong> ${providerName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p style="color: #666;">Please arrive 10 minutes early.</p>
        `;

        const result = await this.sendEmail({
            to: userEmail,
            subject: 'Appointment Reminder',
            html,
        });

        console.log('=====================================================================\n');
        return result;
    }

    /**
     * Send appointment cancellation notification
     */
    async sendAppointmentCancellation(userEmail, appointmentDetails) {
        console.log('\n==================== SENDING CANCELLATION NOTIFICATION ====================');

        const { providerName, date, time } = appointmentDetails;

        const html = `
            <h2>Appointment Cancelled</h2>
            <p>Your appointment has been cancelled:</p>
            <p><strong>Provider:</strong> ${providerName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p style="margin-top: 20px;">To reschedule, please visit the app or contact us.</p>
        `;

        const result = await this.sendEmail({
            to: userEmail,
            subject: 'Appointment Cancelled',
            html,
        });

        console.log('===========================================================================\n');
        return result;
    }
}

module.exports = new EmailNotificationService();
