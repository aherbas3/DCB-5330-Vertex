const express = require("express");
const router = express.Router();
const { verifyFirebaseToken } = require("../auth/authorizetokens");
const UserService = require("../services/userService");

// Get user profile from PostgreSQL
router.get("/profile", verifyFirebaseToken, async (req, res) => {
    try {
        const { email } = req.user;
        console.log("Fetching PostgreSQL profile for user:", email);

        const user = await UserService.getUserByEmail(email);

        if (!user) {
            return res.status(404).json({
                error: "User profile not found",
                message: "No profile exists for this user in PostgreSQL. Please sync first."
            });
        }

        res.json({
            message: "Profile retrieved successfully from PostgreSQL",
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone_number: user.phone_number,
                language: user.language,
                notifications_enabled: user.notifications_enabled
            }
        });
    } catch (err) {
        console.error("Error fetching PostgreSQL profile:", err);
        res.status(500).json({
            error: "Failed to fetch profile",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Update user profile in PostgreSQL
router.put("/profile", verifyFirebaseToken, async (req, res) => {
    try {
        const { email } = req.user;
        const updates = req.body;

        console.log("Updating PostgreSQL profile for user:", email);

        // Validate updates - only allow certain fields to be updated
        const allowedFields = ['first_name', 'last_name', 'phone_number', 'language', 'notifications_enabled'];
        const filteredUpdates = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({
                error: "No valid fields to update"
            });
        }

        const updatedUser = await UserService.updateUser(email, filteredUpdates);

        res.json({
            message: "Profile updated successfully in PostgreSQL",
            user: {
                id: updatedUser.id,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                email: updatedUser.email,
                phone_number: updatedUser.phone_number,
                language: updatedUser.language,
                notifications_enabled: updatedUser.notifications_enabled
            }
        });
    } catch (err) {
        console.error("Error updating PostgreSQL profile:", err);
        res.status(500).json({
            error: "Failed to update profile",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Delete user from PostgreSQL
router.delete("/account", verifyFirebaseToken, async (req, res) => {
    try {
        const { email } = req.user;

        console.log("Deleting PostgreSQL user account:", email);

        const deletedUser = await UserService.deleteUser(email);

        res.json({
            message: "User account deleted successfully from PostgreSQL",
            user: {
                id: deletedUser.id,
                email: deletedUser.email
            }
        });
    } catch (err) {
        console.error("Error deleting PostgreSQL user:", err);
        res.status(500).json({
            error: "Failed to delete user",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Check if user exists in PostgreSQL
router.get("/check", verifyFirebaseToken, async (req, res) => {
    try {
        const { email } = req.user;

        const exists = await UserService.userExists(email);

        res.json({
            exists: exists,
            email: email
        });
    } catch (err) {
        console.error("Error checking PostgreSQL user:", err);
        res.status(500).json({ error: "Failed to check user status" });
    }
});

// Sync user to PostgreSQL (manual sync endpoint)
router.post("/sync", verifyFirebaseToken, async (req, res) => {
    try {
        const { email } = req.user;
        const userData = req.body;

        console.log("Manually syncing user to PostgreSQL:", email);

        // Prepare data for PostgreSQL
        const postgresUserData = {
            first_name: userData.first_name || email.split('@')[0],
            last_name: userData.last_name || 'User',
            email: email,
            phone_number: userData.phone_number || '999-999-9999',
            language: userData.language || 'English',
            notifications_enabled: userData.notifications_enabled !== undefined ? userData.notifications_enabled : true
        };

        const syncedUser = await UserService.syncUser(postgresUserData);

        res.json({
            message: "User synced successfully to PostgreSQL",
            user: {
                id: syncedUser.id,
                first_name: syncedUser.first_name,
                last_name: syncedUser.last_name,
                email: syncedUser.email,
                phone_number: syncedUser.phone_number,
                language: syncedUser.language,
                notifications_enabled: syncedUser.notifications_enabled
            }
        });
    } catch (err) {
        console.error("Error syncing user to PostgreSQL:", err);
        res.status(500).json({
            error: "Failed to sync user",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;
