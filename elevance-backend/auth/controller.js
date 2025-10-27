const { admin, db } = require("../firebase");
const SyncService = require("../services/syncService");

exports.syncUser = async (req, res) => {
    try {
        const firebaseUser = req.user;
        const firestoreResult = await SyncService.syncFirebaseToFirestore(firebaseUser);
        await SyncService.mirrorToPostgres(firestoreResult);
        res.json({ message: "✅ User synced", ...firestoreResult });
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: "Failed to sync user", details: err.message });
    }
};
