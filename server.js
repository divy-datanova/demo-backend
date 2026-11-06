require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const REQUIRED_ENV = ["MONGO_URI"];

const app = express();
const PORT = process.env.PORT || 5001;

// Connect once, then reuse the connection across requests - this also works on
// Vercel, where the app runs as a serverless function
let dbReady;
const initDB = () => {
  dbReady ??= connectDB().catch((err) => {
    dbReady = null; // retry on the next request
    throw err;
  });
  return dbReady;
};

// For routes that need the database (the app's own data), e.g.
// app.use("/api/notes", authcore.requireAuth, ensureReady, noteRoutes). Sign-in doesn't.
const ensureReady = async (req, res, next) => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(", ")}. See .env.example`);
    return res.status(500).json({ message: `Server is missing environment variables: ${missing.join(", ")}` });
  }

  try {
    await initDB();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    return res.status(503).json({ message: "Cannot connect to the database" });
  }
  next();
};

// Browsers send the Origin without a trailing slash, so strip one from CLIENT_URL.
// credentials: the session is an HttpOnly cookie that travels with the frontend's requests.
app.use(cors({ origin: process.env.CLIENT_URL?.replace(/\/+$/, ""), credentials: true }));
app.use(express.json());

app.get(["/", "/api/health"], (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Express 5 forwards errors from async handlers here automatically
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.expose ? err.message : "Server error" });
});

// `node server.js` (npm start / npm run dev) starts a normal server;
// on Vercel the exported app is used instead
if (require.main === module) {
  // Express 5 passes startup errors here, such as the port being taken by another copy of this
  // server: stop instead of reporting a server that isn't listening
  app.listen(PORT, (err) => {
    if (err) {
      console.error(`Cannot start on port ${PORT}: ${err.message}`);
      process.exit(1);
    }
    console.log(`Server running on http://localhost:${PORT}`);
    initDB().catch((err) => console.error("MongoDB connection failed:", err.message));
  });
}

module.exports = app;
