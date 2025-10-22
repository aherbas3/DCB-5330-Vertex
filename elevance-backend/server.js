require("dotenv").config();
const express = require("express");
const cors = require("cors");
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
      userProfile: "GET /users/profile"
    }
  });
});

// Auth routes
app.use("/auth", authRoutes);

// User routes
app.use("/users", userRoutes);


app.get("/protected", verifyFirebaseToken, (req, res) => {
  console.log("Email:", req.user.email);
  res.json({ message: `Hello ${req.user.email}, token verified ` });
});





const PORT = process.env.PORT || 5050;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
