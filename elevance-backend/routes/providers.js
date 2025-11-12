const express = require("express");
const router = express.Router();
const { query, supabase } = require("../supabaseClient");
const { verifyFirebaseToken } = require("../auth/authorizetokens");

// Get all providers (for client-side filtering)
router.get("/all", verifyFirebaseToken, async (req, res) => {
    console.log("📞 GET /providers/all called");
    console.log("👤 User:", req.user?.email);

    try {
        // Use Supabase SDK to fetch providers (without location for now)
        console.log("🔍 Fetching providers via Supabase SDK...");

        const { data, error } = await supabase
            .from('providers')
            .select('id, name, specialty, cost, rating, in_network, latitude, longitude')
            .order('rating', { ascending: false });

        if (error) {
            console.error("❌ Supabase error:", error);
            throw error;
        }

        console.log(`✅ Supabase returned ${data?.length || 0} providers`);

        if (data && data.length > 0) {
            console.log("📋 Sample provider:", data[0]);
        }

        res.json({ providers: data });
        console.log("✅ Response sent successfully");
    } catch (err) {
        console.error("❌ Error fetching all providers:", err);
        console.error("Error message:", err.message);
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
        console.log(`📞 GET /providers/${id}/slots called`);

        // Get provider's recurring availability using Supabase SDK
        const { data: slotsData, error: slotsError } = await supabase
            .from('provider_slots')
            .select('id, day_of_week, start_time, end_time, slot_duration_minutes')
            .eq('provider_id', id)
            .eq('is_available', true)
            .order('day_of_week')
            .order('start_time');

        if (slotsError) {
            console.error("❌ Error fetching provider slots:", slotsError);
            throw slotsError;
        }

        if (!slotsData || slotsData.length === 0) {
            console.log(`⚠️ No slots configured for provider ${id}`);
            return res.json({ slots: [] });
        }

        console.log(`✅ Found ${slotsData.length} slot configurations`);

        // Generate slots for next 14 days
        const availableSlots = [];
        for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() + dayOffset);
            checkDate.setHours(0, 0, 0, 0);

            const dayOfWeek = checkDate.getDay();
            const daySlots = slotsData.filter(s => s.day_of_week === dayOfWeek);

            for (const config of daySlots) {
                const [startH, startM] = config.start_time.split(':');
                const [endH, endM] = config.end_time.split(':');

                let slot = new Date(checkDate);
                slot.setHours(parseInt(startH), parseInt(startM), 0, 0);

                const endTime = new Date(checkDate);
                endTime.setHours(parseInt(endH), parseInt(endM), 0, 0);

                while (slot < endTime) {
                    if (slot > new Date()) {
                        availableSlots.push(slot.toISOString());
                    }
                    slot.setMinutes(slot.getMinutes() + config.slot_duration_minutes);
                }
            }
        }

        console.log(`📅 Generated ${availableSlots.length} time slots`);

        // Filter out booked slots using Supabase SDK
        const { data: appointments, error: apptsError } = await supabase
            .from('appointments')
            .select('appointment_date, start_time')
            .eq('provider_id', id)
            .eq('status', 'scheduled')
            .gte('appointment_date', new Date().toISOString().split('T')[0]);

        if (apptsError) {
            console.error("❌ Error fetching appointments:", apptsError);
            // Continue without filtering if appointments query fails
            return res.json({ slots: availableSlots });
        }

        const booked = new Set(
            (appointments || []).map(a => `${new Date(a.appointment_date).toISOString().split('T')[0]}T${a.start_time}`)
        );

        const filtered = availableSlots.filter(slot => {
            const key = slot.substring(0, 16);
            return !booked.has(key);
        });

        console.log(`✅ Returning ${filtered.length} available slots (${booked.size} booked)`);
        res.json({ slots: filtered });
    } catch (err) {
        console.error("❌ Error fetching slots:", err);
        res.status(500).json({ error: "Failed to fetch slots", details: err.message });
    }
});

module.exports = router;
