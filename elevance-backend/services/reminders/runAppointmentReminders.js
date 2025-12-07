const { supabase } = require('../../supabaseClient');
const notificationService = require('../notificationService');

const originalConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };
Object.keys(originalConsole).forEach(method => {
    console[method] = () => {};
});
require('dotenv').config();
Object.keys(originalConsole).forEach(method => {
    console[method] = originalConsole[method];
});

const DEMO_USER_ID = process.env.DEMO_USER_ID;

function diffDays(appointmentDate, today = new Date()) {
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const appointmentDateObj = new Date(year, month - 1, day);
    const diffMs = appointmentDateObj - todayMidnight;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatDateForReminder(dateStr) {
    const [year, monthNum, day] = dateStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[monthNum - 1];
    return `${month} ${day} ${year}`;
}

function formatTimeForReminder(timeStr) {
    const timePart = timeStr.substring(0, 5);
    const [hour24, minute] = timePart.split(':').map(Number);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    if (minute > 0) {
        return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } else {
        return `${hour12} ${ampm}`;
    }
}

async function runAppointmentReminders() {
    console.log('\nRunning appointment reminders...');

    if (!DEMO_USER_ID) {
        console.warn('DEMO_USER_ID is not set. Skipping.');
        return;
    }

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', parseInt(DEMO_USER_ID))
            .single();

        if (userError || !user) {
            console.error('Failed to fetch demo user:', userError?.message || 'User not found');
            return;
        }

        console.log(`User: ${user.email}`);

        const notificationsEnabled = user.notifications_enabled !== false;
        
        if (!notificationsEnabled) {
            console.log('Notifications disabled. Skipping.');
            return;
        }

        const firebaseUid = user.firebase_uid;
        if (!firebaseUid) {
            console.error('User missing firebase_uid');
            return;
        }

        const userPhoneNumber = user.phone_number;
        if (!userPhoneNumber) {
            console.warn('No phone number. Cannot send reminders.');
        }

        const notificationMethod = user.notification_method === 'WhatsApp' ? 'WhatsApp' : 'SMS';

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const { data: appointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select(`
                *,
                providers:provider_id (
                    id,
                    name,
                    specialty
                )
            `)
            .eq('user_id', firebaseUid)
            .eq('status', 'scheduled')
            .gte('appointment_date', todayStr)
            .order('appointment_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (appointmentsError) {
            console.error('Failed to fetch appointments:', appointmentsError.message);
            return;
        }

        if (!appointments || appointments.length === 0) {
            console.log('No upcoming appointments found');
            return;
        }

        console.log(`Checking ${appointments.length} appointment(s)...`);

        let remindersSent = 0;
        let remindersFailed = 0;

        for (const appointment of appointments) {
            const daysUntil = diffDays(appointment.appointment_date, today);

            if (daysUntil === 5 || daysUntil === 1) {
                const providerName = appointment.providers?.name || 'Unknown';
                const formattedDate = formatDateForReminder(appointment.appointment_date);
                const formattedTime = formatTimeForReminder(appointment.start_time);

                if (!userPhoneNumber) {
                    console.log(`${daysUntil}-day reminder needed: ${providerName} on ${formattedDate} (no phone number)`);
                    continue;
                }

                const appointmentDetails = {
                    providerName: providerName,
                    date: formattedDate,
                    time: formattedTime
                };

                try {
                    const result = await notificationService.sendAppointmentReminder(
                        userPhoneNumber,
                        appointmentDetails,
                        notificationMethod,
                        user.id
                    );

                    if (result.success) {
                        console.log(`${daysUntil}-day reminder sent: ${providerName} on ${formattedDate} at ${formattedTime} (${notificationMethod})`);
                        remindersSent++;
                    } else {
                        console.error(`Failed: ${providerName} on ${formattedDate} - ${result.error}`);
                        remindersFailed++;
                    }
                } catch (error) {
                    console.error(`Error: ${providerName} on ${formattedDate} - ${error.message}`);
                    remindersFailed++;
                }
            }
        }

        if (remindersSent === 0 && remindersFailed === 0) {
            console.log('No reminders needed at this time');
        } else {
            console.log(`Completed: ${remindersSent} sent, ${remindersFailed} failed`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

module.exports = { runAppointmentReminders };
