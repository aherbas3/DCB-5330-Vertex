const fs = require("fs");
const path = require("path");

// Load the file
const filePath = path.join(__dirname, "googlecalendarvar.json");
console.log("Loading:", filePath);

try {
    const raw = fs.readFileSync(filePath, "utf8");
    console.log("\n=== RAW FILE CONTENT (first 200 chars) ===");
    console.log(raw.substring(0, 200));

    console.log("\n=== PARSED JSON KEYS ===");
    const json = JSON.parse(raw);
    console.log("type:", json.type);
    console.log("project_id:", json.project_id);
    console.log("client_email:", json.client_email);
    console.log("private_key length:", json.private_key?.length);

    console.log("\n=== PRIVATE KEY FIRST 50 CHARS ===");
    console.log(json.private_key.substring(0, 50));

    console.log("\n=== PRIVATE KEY LAST 20 CHARS ===");
    console.log(json.private_key.substring(json.private_key.length - 20));

} catch (err) {
    console.error("❌ ERROR READING OR PARSING FILE");
    console.error(err);
}
