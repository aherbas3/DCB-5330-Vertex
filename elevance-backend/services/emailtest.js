require('dotenv').config({ path: '../.env' });

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY_GMAIL);

(async () => {
    try {
        console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY_GMAIL); // debug

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'anay.badlani@gmail.com',
            subject: 'Hello World',
            html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
        });

        console.log("DATA:", data);
        console.log("ERROR:", error);
    } catch (err) {
        console.error("FAILED:", err);
    }
})();
