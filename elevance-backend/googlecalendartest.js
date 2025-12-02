const fs = require("fs");
const { GoogleAuth } = require("google-auth-library");
const { google } = require("googleapis");
const dayjs = require("dayjs");

(async () => {
    console.log("===== GOOGLE CALENDAR TEST (MODERN AUTH) =====");

    const serviceAccount = JSON.parse(fs.readFileSync("./googlecalendarvar.json", "utf8"));

    console.log("Loaded client_email:", serviceAccount.client_email);

    const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: ["https://www.googleapis.com/auth/calendar"]
    });

    const authClient = await auth.getClient();
    console.log("✔ Auth client created (Node 22 compatible)");

    const calendar = google.calendar({ version: "v3", auth: authClient });

    const start = dayjs().add(1, "day").hour(12).minute(0).toISOString();
    const end   = dayjs(start).add(1, "hour").toISOString();

    console.log("Creating event...");

    const res = await calendar.events.insert({
        calendarId: "primary",
        resource: {
            summary: "🔥 Node 22-Compatible Event",
            description: "GoogleAuth bypasses JWT + gtoken issues.",
            start: { dateTime: start, timeZone: "America/New_York" },
            end:   { dateTime: end,   timeZone: "America/New_York" },
            attendees: [{ email: "anay.badlani@gmail.com" }]
        },
        sendUpdates: "all"
    });

    console.log("✔ Event Created!");
    console.log("Event ID:", res.data.id);
    console.log("Link:", res.data.htmlLink);
})();
