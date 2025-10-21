// server.js
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Verify Firebase JWT token
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

// Root route
app.get("/", (req, res) => {
  res.json({ message: "✅ Elevance backend running" });
});

// Signup route
app.post("/signup", verifyToken, async (req, res) => {
  try {
    const { email, uid } = req.user;
    await db.collection("users").doc(uid).set({
      email,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ New user saved: ${email}`);
    res.json({
      message: "Signup successful",
      profile: { email, uid },
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ error: "Signup failed", details: err.message });
  }
});

// Login route
app.post("/login", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`✅ User logged in: ${uid}`);
    res.json({
      message: "Login successful",
      profile: userDoc.data(),
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// Catch-all (so backend never sends empty response)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
