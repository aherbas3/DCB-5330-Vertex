const { admin, db } = require("../firebase");

// Helper function to validate user data before storage
function validateUserData(userData) {
    const { uid, email } = userData;

    if (!uid || typeof uid !== 'string') {
        throw new Error('Invalid UID');
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new Error('Invalid email format');
    }

    return true;
}

async function syncUser(req, res) {
    try {
        const decoded = req.user;
        const { uid, email, email_verified } = decoded;

        validateUserData({ uid, email });

        console.log("Syncing user to Firestore:", email);

        const userRef = db.collection("users").doc(uid);

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (userDoc.exists) {
                console.log("Existing user, updating last login");

                const currentData = userDoc.data();
                const updateData = {
                    lastLogin: new Date().toISOString(),
                    loginCount: (currentData.loginCount || 0) + 1,
                    emailVerified: email_verified || currentData.emailVerified || false
                };

                transaction.update(userRef, updateData);

                return {
                    message: "Welcome back! User synced successfully",
                    uid,
                    email,
                    isNewUser: false,
                    loginCount: updateData.loginCount
                };
            } else {
                console.log("New user, creating profile");

                try {
                    const userRecord = await admin.auth().getUser(uid);

                    if (userRecord.email !== email) {
                        throw new Error('Email mismatch between token and user record');
                    }
                } catch (authErr) {
                    console.error("Failed to verify user in Firebase Auth:", authErr);
                    throw new Error('User verification failed');
                }

                const newUserData = {
                    uid,
                    email,
                    emailVerified: email_verified || false,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    loginCount: 1,
                    profile: {
                        displayName: email.split('@')[0],
                        photoURL: null,
                        bio: null
                    },
                    settings: {
                        notifications: true,
                        theme: 'light',
                        language: 'en'
                    },
                    metadata: {
                        source: 'web',
                        version: '1.0.0'
                    }
                };

                transaction.set(userRef, newUserData);

                return {
                    message: "New user created and synced",
                    uid,
                    email,
                    isNewUser: true
                };
            }
        });

        // Send successful response
        res.json(result);

    } catch (err) {
        console.error("Sync error:", err);

        // Determine appropriate error response
        if (err.message.includes('validation') || err.message.includes('Invalid')) {
            res.status(400).json({
                error: "Invalid user data",
                details: err.message
            });
        } else if (err.code === 'permission-denied') {
            res.status(403).json({
                error: "Permission denied",
                details: "Insufficient permissions to sync user"
            });
        } else {
            res.status(500).json({
                error: "Failed to sync user",
                details: err.message
            });
        }
    }
}

async function getUserProfile(req, res) {
    try {
        const { uid } = req.user;
        console.log("Fetching profile for user:", uid);

        // Validate UID
        if (!uid || typeof uid !== 'string') {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const userDoc = await db.collection("users").doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                error: "User profile not found",
                message: "No profile exists for this user. Please sync first."
            });
        }

        const userData = userDoc.data();

        // Remove sensitive data before sending
        const { ...safeUserData } = userData;

        res.json({
            message: "Profile retrieved successfully",
            user: safeUserData
        });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({
            error: "Failed to fetch profile",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}

async function updateUserProfile(req, res) {
    try {
        const { uid } = req.user;
        const updates = req.body;

        // Validate UID
        if (!uid || typeof uid !== 'string') {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        // Validate updates - only allow certain fields to be updated
        const allowedFields = ['profile', 'settings'];
        const filteredUpdates = {};

        for (const field of allowedFields) {
            if (updates[field]) {
                filteredUpdates[field] = updates[field];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({
                error: "No valid fields to update"
            });
        }

        // Add update timestamp
        filteredUpdates.updatedAt = new Date().toISOString();

        await db.collection("users").doc(uid).update(filteredUpdates);

        res.json({
            message: "Profile updated successfully",
            updated: Object.keys(filteredUpdates)
        });
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({
            error: "Failed to update profile",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}

async function deleteUser(req, res) {
    try {
        const { uid } = req.user;

        console.log("Deleting user account:", uid);

        if (!uid || typeof uid !== 'string') {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const batch = db.batch();

        const userRef = db.collection("users").doc(uid);
        batch.delete(userRef);



        // Commit the batch
        await batch.commit();

        try {
            await admin.auth().deleteUser(uid);
            console.log("User deleted from Firebase Auth");
        } catch (authErr) {
            console.error("Failed to delete from Auth:", authErr);

        }

        res.json({
            message: "User account deleted successfully",
            uid
        });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({
            error: "Failed to delete user",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}

async function checkUserExists(req, res) {
    try {
        const { uid } = req.user;

        const userDoc = await db.collection("users").doc(uid).get();

        res.json({
            exists: userDoc.exists,
            uid
        });
    } catch (err) {
        console.error("Error checking user:", err);
        res.status(500).json({ error: "Failed to check user status" });
    }
}

module.exports = {
    syncUser,
    getUserProfile,
    updateUserProfile,
    deleteUser,
    checkUserExists
};