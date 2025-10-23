require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initializeDatabase, testConnection } = require("./database");
const app = express();

app.use(cors({
  origin: function(origin, callback) {
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log("\n=================================");
  console.log("Method:", req.method);
  console.log("Path:", req.path);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }
  console.log("=================================\n");
  next();
});

const authRoutes = require("./auth/routes");
const userRoutes = require("./routes/users");
const postgresUserRoutes = require("./routes/postgresUsers");
const { verifyFirebaseToken } = require("./auth/authorizetokens");

app.get("/", (req, res) => {
  console.log("✅ Root endpoint hit - server is running!");
  res.json({
    message: "Elevance backend running",
    timestamp: new Date().toISOString(),
    endpoints: {
      root: "GET /",
      authSync: "POST /auth/sync",
      protected: "GET /protected",
      userProfile: "GET /users/profile",
      postgresProfile: "GET /postgres-users/profile",
      postgresSync: "POST /postgres-users/sync"
    }
  });
});

// Auth routes
app.use("/auth", authRoutes);

// User routes (Firestore)
app.use("/users", userRoutes);

// PostgreSQL User routes
app.use("/postgres-users", postgresUserRoutes);


app.get("/protected", verifyFirebaseToken, (req, res) => {
  console.log("Email:", req.user.email);
  res.json({ message: `Hello ${req.user.email}, token verified ` });
});





const PORT = process.env.PORT || 5050;

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔄 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Server not started.');
      process.exit(1);
    }

    // Initialize database schema
    await initializeDatabase();

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database connected and schema initialized`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
