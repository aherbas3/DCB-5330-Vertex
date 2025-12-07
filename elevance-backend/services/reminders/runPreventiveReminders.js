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

function diffDays(dueDate, today = new Date()) {
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [year, month, day] = dueDate.split('-').map(Number);
    const dueDateObj = new Date(year, month - 1, day);
    const diffMs = dueDateObj - todayMidnight;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function isValidDateString(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
        return false;
    }
    const date = new Date(dateStr + 'T00:00:00');
    if (!(date instanceof Date) || isNaN(date)) {
        return false;
    }
    return dateStr === date.toISOString().split('T')[0];
}

function formatDateForReminder(dateStr) {
    const [year, monthNum, day] = dateStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[monthNum - 1];
    return `${month} ${day} ${year}`;
}

async function runPreventiveReminders() {
    console.log('\nRunning preventive reminders...');

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

        const userPhoneNumber = user.phone_number;
        if (!userPhoneNumber) {
            console.warn('No phone number. Cannot send reminders.');
        }

        const notificationMethod = user.notification_method === 'WhatsApp' ? 'WhatsApp' : 'SMS';

        const preventiveDueDates = user.preventive_due_dates;

        if (!preventiveDueDates || 
            typeof preventiveDueDates !== 'object' || 
            Array.isArray(preventiveDueDates) || 
            Object.keys(preventiveDueDates).length === 0) {
            console.log('No preventive due dates set');
            return;
        }

        console.log(`Checking ${Object.keys(preventiveDueDates).length} preventive care item(s)...`);

        const today = new Date();

        let remindersSent = 0;
        let remindersFailed = 0;

        for (const [key, dateStr] of Object.entries(preventiveDueDates)) {
            if (!dateStr) {
                continue;
            }

            if (!isValidDateString(dateStr)) {
                continue;
            }

            const daysUntil = diffDays(dateStr, today);

            if (daysUntil < 0) {
                continue;
            }

            if (daysUntil === 30 || daysUntil === 7 || daysUntil === 0) {
                const formattedDate = formatDateForReminder(dateStr);
                const friendlyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                if (!userPhoneNumber) {
                    console.log(`${daysUntil}-day reminder needed: ${friendlyLabel} on ${formattedDate} (no phone number)`);
                    continue;
                }

                const preventiveDetails = {
                    type: key,
                    dueDate: formattedDate
                };

                try {
                    const result = await notificationService.sendPreventiveReminder(
                        userPhoneNumber,
                        preventiveDetails,
                        notificationMethod,
                        user.id
                    );

                    if (result.success) {
                        console.log(`${daysUntil}-day reminder sent: ${friendlyLabel} on ${formattedDate} (${notificationMethod})`);
                        remindersSent++;
                    } else {
                        console.error(`Failed: ${friendlyLabel} on ${formattedDate} - ${result.error}`);
                        remindersFailed++;
                    }
                } catch (error) {
                    console.error(`Error: ${friendlyLabel} on ${formattedDate} - ${error.message}`);
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

module.exports = { runPreventiveReminders };
