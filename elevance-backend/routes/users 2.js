const express = require("express");
const router = express.Router();
const { verifyFirebaseToken } = require("../auth/authorizetokens");
const {
    getUserProfile,
    deleteUser,
} = require("../auth/controller");

router.get("/health", (req, res) => {
    res.json({
        status: "User service healthy",
        timestamp: new Date().toISOString(),
    });
});

router.get("/profile", verifyFirebaseToken, getUserProfile);


router.delete("/account", verifyFirebaseToken, deleteUser);

module.exports = router;
