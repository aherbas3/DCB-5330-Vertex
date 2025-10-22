const { admin, db } = require("../firebase");

async function syncUser(req, res) {
    try {
        const decoded = req.user;
        const { uid, email, email_verified } = decoded;

        console.log("Syncing user to Firestore:", email);

        const userDoc = await db.collection("users").doc(uid).get();

        if (userDoc.exists) {
            console.log("Existing user, updating last login");
            await db.collection("users").doc(uid).update({
                lastLogin: new Date().toISOString(),
                loginCount: admin.firestore.FieldValue.increment(1)
            });

            res.json({
                message: "Welcome back! User synced successfully",
                uid,
                email,
                isNewUser: false
            });
        } else {
            console.log("New user, create profile");
            await db.collection("users").doc(uid).set({
                uid,
                email,
                emailVerified: email_verified || false,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                loginCount: 1,
                profile: {
                    displayName: email.split('@')[0]

                },
                settings: {
                    notifications: true,
                    theme: 'light'
                }
            });

            res.json({
                message: "New user created and synced",
                uid,
                email,
                isNewUser: true
            });
        }
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: "Failed to sync user", details: err.message });
    }
}

async function getUserProfile(req, res) {
    try {
        const { uid } = req.user;
        console.log("Fetching profile for user:", uid);

        const userDoc = await db.collection("users").doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "User profile not found" });
        }

        const userData = userDoc.data();
        res.json({
            message: "Profile retrieved successfully",
            user: userData
        });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
}


async function deleteUser(req, res) {
    try {
        const { uid } = req.user;

        console.log("Deleting user account:", uid);

        await db.collection("users").doc(uid).delete();

        await admin.auth().deleteUser(uid);

        res.json({ message: "User account deleted successfully" });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
}

module.exports = {
    syncUser,
    getUserProfile,
    deleteUser
};