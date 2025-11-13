const express = require("express");
const router = express.Router();
const axios = require("axios");
const { verifyFirebaseToken } = require("../auth/authorizetokens");

// Calculate driving distances from origin to multiple destinations
router.post("/calculate", verifyFirebaseToken, async (req, res) => {
    try {
        const { origin, destinations } = req.body;

        if (!origin || !destinations || !Array.isArray(destinations)) {
            return res.status(400).json({
                error: "Invalid request",
                details: "origin and destinations array are required"
            });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: "Google Maps API key not configured"
            });
        }

        // Build destinations string (lat,lng|lat,lng|...)
        const destinationsStr = destinations
            .map(d => `${d.lat},${d.lng}`)
            .join('|');

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
        const params = {
            origins: `${origin.lat},${origin.lng}`,
            destinations: destinationsStr,
            mode: "driving",
            units: "imperial",
            key: apiKey
        };

        const response = await axios.get(url, { params });

        if (response.data.status !== 'OK') {
            return res.status(500).json({
                error: "Distance Matrix API error",
                details: response.data.status
            });
        }

        // Extract distances for each destination
        const distances = {};
        response.data.rows[0]?.elements.forEach((element, index) => {
            if (element.status === 'OK' && element.distance) {
                const destination = destinations[index];
                distances[destination.id] = {
                    miles: element.distance.value * 0.000621371, // meters to miles
                    meters: element.distance.value,
                    text: element.distance.text,
                    duration: element.duration?.text || null,
                    durationValue: element.duration?.value || null
                };
            }
        });

        res.json({ distances });
    } catch (err) {
        console.error("Error calculating distances:", err);
        res.status(500).json({
            error: "Failed to calculate distances",
            details: err.message
        });
    }
});

module.exports = router;
