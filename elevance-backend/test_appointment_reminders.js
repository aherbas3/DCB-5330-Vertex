const { runAppointmentReminders } = require('./services/reminders/runAppointmentReminders');

(async () => {
    try {
        await runAppointmentReminders();
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
})();

