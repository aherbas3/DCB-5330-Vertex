const express = require("express");
const router = express.Router();
const { verifyFirebaseToken } = require("../auth/authorizetokens");
const UserService = require("../services/userService");

router.get("/health", (_, res) => {
    res.json({ status: "User service healthy", timestamp: new Date().toISOString() });
});

router.get("/profile", verifyFirebaseToken, async (req, res) => {
    try {
        const user = await UserService.getUserByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ message: "Profile retrieved", user });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

router.put("/profile", verifyFirebaseToken, async (req, res) => {
    try {
        const updated = await UserService.updateUser(req.user.email, req.body);
        res.json({ message: "Profile updated", user: updated });
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

router.delete("/account", verifyFirebaseToken, async (req, res) => {
    try {
        const deleted = await UserService.deleteUser(req.user.email);
        res.json({ message: "Account deleted", user: deleted });
    } catch (err) {
        console.error("Error deleting account:", err);
        res.status(500).json({ error: "Failed to delete account" });
    }
});

router.get("/check", verifyFirebaseToken, async (req, res) => {
    try {
        const exists = await UserService.userExists(req.user.email);
        res.json({ exists });
    } catch (err) {
        console.error("Error checking user existence:", err);
        res.status(500).json({ error: "Failed to check user existence" });
    }
});

module.exports = router;
