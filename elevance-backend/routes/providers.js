const express = require("express");
const router = express.Router();
const { query } = require("../supabaseClient");
const { verifyFirebaseToken } = require("../auth/authorizetokens");

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

module.exports = router;
