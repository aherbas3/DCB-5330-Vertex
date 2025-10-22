const express = require("express");
const router = express.Router();
const { verifyFirebaseToken } = require("./authorizetokens");
const {
    syncUser,
    getUserProfile,
    deleteUser
} = require("./controller");

router.get("/health", (req, res) => {
    res.json({ status: "Auth service is healthy", timestamp: new Date().toISOString() });
});

// require Firebase token
router.post("/sync", verifyFirebaseToken, syncUser);
router.get("/profile", verifyFirebaseToken, getUserProfile);
router.delete("/account", verifyFirebaseToken, deleteUser);

module.exports = router;