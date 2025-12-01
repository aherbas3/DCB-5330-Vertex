require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, _, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

app.use("/users", require("./routes/users"));
app.use("/providers", require("./routes/providers"));
app.use("/appointments", require("./routes/appointments"));
app.use("/auth", require("./routes/auth"));
app.use("/distances", require("./routes/distances"));

app.get("/", (_, res) => res.json({ status: "Server running" }));

// Catch-all for debugging 404s
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: "Route not found", 
    method: req.method, 
    path: req.path,
    availableRoutes: ["/", "/users/*", "/providers/all", "/providers/search", "/providers/:id/slots", "/appointments", "/auth/*", "/distances/*"]
  });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () =>
    console.log(`🚀 Server running on port ${PORT}`)
);