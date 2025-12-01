const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require("dotenv").config();

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
    console.error("❌ GOOGLE_MAPS_API_KEY not set in .env");
    process.exit(1);
}

const ORIGIN = "Atlanta,GA";
const DEST = "New York,NY";

async function testAPI(name, url) {
    try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.error_message || json.status === "REQUEST_DENIED") {
            console.log(`❌ ${name} FAILED`);
            console.log("Reason:", json.error_message || json.status);
        } else {
            console.log(`✅ ${name} OK`);
        }
    } catch (err) {
        console.log(`❌ ${name} FAILED`);
        console.error(err);
    }
}

(async () => {
    console.log("========== Testing Google Maps APIs ==========\n");

    await testAPI(
        "Geocoding API",
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            ORIGIN
        )}&key=${API_KEY}`
    );

    await testAPI(
        "Directions API",
        `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
            ORIGIN
        )}&destination=${encodeURIComponent(DEST)}&key=${API_KEY}`
    );

    await testAPI(
        "Distance Matrix API",
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
            ORIGIN
        )}&destinations=${encodeURIComponent(DEST)}&key=${API_KEY}`
    );

    await testAPI(
        "Routes API",
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=${API_KEY}`
    );

    await testAPI(
        "Maps JavaScript API",
        `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`
    );

    console.log("\n========== Done ==========");
})();
