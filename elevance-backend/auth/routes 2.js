const express = require("express");
const router = express.Router();
const { verifyFirebaseToken } = require("./authorizetokens");
const {
    syncUser,
    getUserProfile,
    updateUserProfile,
    deleteUser,
    checkUserExists
} = require("./controller");

router.get("/health", (req, res) => {
    res.json({
        status: "Auth service is healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
    });
});

router.post("/sync", verifyFirebaseToken, syncUser);
router.get("/profile", verifyFirebaseToken, getUserProfile);
router.put("/profile", verifyFirebaseToken, updateUserProfile);
router.delete("/account", verifyFirebaseToken, deleteUser);
router.get("/check", verifyFirebaseToken, checkUserExists);

module.exports = router;