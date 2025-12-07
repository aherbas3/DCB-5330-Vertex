const { runPreventiveReminders } = require('./services/reminders/runPreventiveReminders');

(async () => {
    try {
        await runPreventiveReminders();
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
})();

