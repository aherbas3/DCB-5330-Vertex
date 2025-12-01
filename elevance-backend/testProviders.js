const { query } = require("./supabaseClient");
require("dotenv").config();

(async () => {
    try {
        const sql = `
            SELECT id, name, specialty, cost, rating, in_network,
                   ST_Y(location::geometry) AS latitude, 
                   ST_X(location::geometry) AS longitude
            FROM providers
            ORDER BY rating DESC
            LIMIT 5
        `;
        const result = await query(sql, []);
        console.log(`Found ${result.rows.length} providers:`);
        if (result.rows.length > 0) {
            result.rows.forEach((p, i) => {
                console.log(`${i + 1}. ${p.name} - Lat: ${p.latitude}, Lon: ${p.longitude}`);
            });
        } else {
            console.log("⚠️  No providers found in database!");
            console.log("💡 Run: node generatedummy.js to seed providers");
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
})();

