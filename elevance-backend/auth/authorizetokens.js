const { admin } = require("../firebase");

async function verifyFirebaseToken(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid token" });
        }

        const token = header.split(" ")[1];
        console.log(" Verifying Firebase token...");

        const decoded = await admin.auth().verifyIdToken(token);
        console.log(" Token verified for user:", decoded.email);

        req.user = decoded;
        next();
    } catch (err) {
        console.error("Token verification failed:", err.message);
        res.status(401).json({ error: "Unauthorized", details: err.message });
    }
}

module.exports = { verifyFirebaseToken };