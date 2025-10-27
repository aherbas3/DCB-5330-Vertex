// generatedummy.js
const { supabase } = require("./supabaseClient");
require("dotenv").config();

(async () => {
    try {
        const baseLat = 33.7490;
        const baseLon = -84.3880;

        const providers = Array.from({ length: 25 }, (_, i) => {
            const latOffset = (Math.random() - 0.5) * 0.1; // ~5km radius
            const lonOffset = (Math.random() - 0.5) * 0.1;

            return {
                name: `Provider ${i + 1}`,
                specialty: ["Cardiology", "Dermatology", "Pediatrics", "Orthopedics", "Family Medicine"][i % 5],
                cost: Math.round(75 + Math.random() * 200),
                rating: parseFloat((3 + Math.random() * 2).toFixed(1)),
                in_network: Math.random() > 0.3,
                location: `SRID=4326;POINT(${baseLon + lonOffset} ${baseLat + latOffset})`,
            };
        });

        console.log("Inserting", providers.length, "providers into Supabase...");

        const { data, error } = await supabase
            .from("providers")
            .insert(providers)
            .select();

        if (error) {
            console.error("❌ Insert error:", error);
        } else {
            console.log("✅ Seeded", data?.length || 0, "providers");
        }
    } catch (err) {
        console.error("❌ Unexpected failure:", err);
    }
})();
