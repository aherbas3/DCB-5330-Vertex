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

app.get("/", (_, res) => res.json({ status: "Server running" }));

const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () =>
    console.log(`🚀 Server running on port ${PORT}`)
);