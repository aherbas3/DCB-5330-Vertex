const express = require("express");
const router = express.Router();
const { verifyFirebaseToken } = require("../auth/authorizetokens");
const { syncUser } = require("../auth/controller");

// Sync user between Firebase and database
router.post("/sync", verifyFirebaseToken, syncUser);

module.exports = router;
