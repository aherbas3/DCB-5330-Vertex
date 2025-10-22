const { admin } = require("../firebase");

async function verifyFirebaseToken(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header) {
            console.log(" Missing authorization header");
            return res.status(401).json({
                error: "Unauthorized",
                details: "No authorization token provided"
            });
        }

        if (!header.startsWith("Bearer ")) {
            console.log("Invalid token format");
            return res.status(401).json({
                error: "Unauthorized",
                details: "Invalid token format. Use 'Bearer <token>'"
            });
        }

        const token = header.split(" ")[1];

        // Check if token exists after Bearer
        if (!token || token === 'undefined' || token === 'null') {
            console.log("⚠️ Empty token");
            return res.status(401).json({
                error: "Unauthorized",
                details: "Token is empty or invalid"
            });
        }

        console.log("Verifying Firebase token...");

        const decoded = await admin.auth().verifyIdToken(token, true);

        console.log("Token verified for user:", decoded.email);
        console.log("   UID:", decoded.uid);
        console.log("   Email verified:", decoded.email_verified || false);

        req.user = decoded;

        if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !decoded.email_verified) {
            return res.status(403).json({
                error: "Email not verified",
                details: "Please verify your email before accessing this resource"
            });
        }

        next();
    } catch (err) {
        console.error(" Token verification failed:", err.message);

        // Handle specific Firebase Auth errors
        if (err.code === 'auth/id-token-expired') {
            return res.status(401).json({
                error: "Token expired",
                details: "Your session has expired. Please sign in again."
            });
        } else if (err.code === 'auth/id-token-revoked') {
            return res.status(401).json({
                error: "Token revoked",
                details: "Your access has been revoked. Please sign in again."
            });
        } else if (err.code === 'auth/invalid-id-token') {
            return res.status(401).json({
                error: "Invalid token",
                details: "The provided token is invalid."
            });
        } else if (err.code === 'auth/user-disabled') {
            return res.status(403).json({
                error: "User disabled",
                details: "This user account has been disabled."
            });
        }

        res.status(401).json({
            error: "Unauthorized",
            details: process.env.NODE_ENV === 'development' ? err.message : "Authentication failed"
        });
    }
}

async function verifyAdmin(req, res, next) {
    try {
        await verifyFirebaseToken(req, res, async () => {
            try {
                const { uid } = req.user;

                const userRecord = await admin.auth().getUser(uid);

                if (userRecord.customClaims && userRecord.customClaims.admin === true) {
                    next();
                } else {
                    res.status(403).json({
                        error: "Forbidden",
                        details: "Admin access required"
                    });
                }
            } catch (err) {
                console.error("Admin verification error:", err);
                res.status(500).json({
                    error: "Failed to verify admin status"
                });
            }
        });
    } catch (err) {
    }
}

async function optionalAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        req.user = null;
        return next();
    }

    try {
        const token = header.split(" ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
    } catch (err) {
        req.user = null;
    }

    next();
}

module.exports = {
    verifyFirebaseToken,
    verifyAdmin,
    optionalAuth
};