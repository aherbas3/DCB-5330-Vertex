require('dotenv').config();
const twilio = require('twilio');

console.log('==================== TWILIO TEST SCRIPT ====================');
console.log('Checking Twilio credentials...');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'NOT SET');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'NOT SET');
console.log('MY_PHONE_NUMBER:', process.env.MY_PHONE_NUMBER || 'NOT SET');
console.log('=============================================================\n');

// Validate environment
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.error("❌ Missing Twilio environment variables.");
    process.exit(1);
}

if (!process.env.MY_PHONE_NUMBER) {
    console.error("❌ Missing MY_PHONE_NUMBER in .env.");
    process.exit(1);
}

// Initialize client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

(async () => {
    try {
        console.log("📨 Sending test SMS...");
        console.log("From:", process.env.TWILIO_PHONE_NUMBER);
        console.log("To:", process.env.MY_PHONE_NUMBER);

        const message = await client.messages.create({
            body: "🚀 Test message from your Twilio trial account!",
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.MY_PHONE_NUMBER
        });

        console.log("\n✅ SMS Sent Successfully!");
        console.log("Message SID:", message.sid);
        console.log("Status:", message.status);
        console.log("To:", message.to);
        console.log("From:", message.from);

    } catch (error) {
        console.error("\n❌ Failed to send SMS");
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
        console.error("More Info:", error.moreInfo);
    }
})();
