const express = require("express");
const router = express.Router();
const { query, supabase } = require("../supabaseClient");
const { verifyFirebaseToken } = require("../auth/authorizetokens");

// Get all providers (for client-side filtering)
router.get("/all", verifyFirebaseToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('providers')
            .select('id, name, specialty, cost, rating, in_network, latitude, longitude')
            .order('rating', { ascending: false });

        if (error) {
            throw error;
        }

        res.json({ providers: data });
    } catch (err) {
        console.error("Error fetching all providers:", err);
        res.status(500).json({
            error: "Failed to fetch providers",
            details: err.message,
        });
    }
});

router.get("/search", verifyFirebaseToken, async (req, res) => {
    const { lat, lon, maxDistance = 25, in_network, minRating, maxCost } = req.query;
    let filters = [];
    let params = [];

    if (in_network) {
        filters.push(`in_network = $${params.push(in_network === "true")}`);
    }
    if (minRating) {
        filters.push(`rating >= $${params.push(Number(minRating))}`);
    }
    if (maxCost) {
        filters.push(`cost <= $${params.push(Number(maxCost))}`);
    }

    params.push(lon, lat, maxDistance * 1609.34);
    filters.push(
        `ST_DWithin(location, ST_MakePoint($${params.length - 2}, $${params.length - 1})::geography, $${params.length})`
    );

    const sql = `
    SELECT id, name, specialty, cost, rating, in_network,
           ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude
    FROM providers
    WHERE ${filters.join(" AND ")}
    ORDER BY rating DESC
    LIMIT 50;
  `;
    const result = await query(sql, params);
    res.json(result.rows);
});

// Get available time slots for a provider
router.get("/:id/slots", verifyFirebaseToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Simply get all available slots from provider_slots table
        const { data: slots, error } = await supabase
            .from('provider_slots')
            .select('appointment_date, start_time, end_time')
            .eq('provider_id', id)
            .gte('appointment_date', new Date().toISOString().split('T')[0])
            .order('appointment_date')
            .order('start_time');

        if (error) {
            throw error;
        }

        // Convert to local datetime strings (space, not T, to avoid UTC interpretation)
        const availableSlots = (slots || []).map(slot => {
            const datetime = `${slot.appointment_date} ${slot.start_time}`;
            return datetime;
        });

        res.json({ slots: availableSlots });
    } catch (err) {
        console.error("Error fetching slots:", err);
        res.status(500).json({ error: "Failed to fetch slots", details: err.message });
    }
});

module.exports = router;
