require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const seedDefaultUser = require("./utils/seedDefaultUser");
const authRoutes = require("./routes/authRoutes");

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];

const app = express();
const PORT = process.env.PORT || 5000;

// Connect (and seed the default user) once, then reuse the connection across
// requests - this also works on Vercel, where the app runs as a serverless function
let dbReady;
const initDB = () => {
  dbReady ??= connectDB()
    .then(seedDefaultUser)
    .catch((err) => {
      dbReady = null; // retry on the next request
      throw err;
    });
  return dbReady;
};

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

// Browsers send the Origin without a trailing slash, so strip one from CLIENT_URL
app.use(cors({ origin: process.env.CLIENT_URL?.replace(/\/+$/, "") }));
app.use(express.json());

app.get(["/", "/api/health"], (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", ensureReady, authRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Express 5 forwards errors from async handlers here automatically
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.expose ? err.message : "Server error" });
});

// `node server.js` (npm start / npm run dev) starts a normal server;
// on Vercel the exported app is used instead
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initDB().catch((err) => console.error("MongoDB connection failed:", err.message));
  });
}

module.exports = app;
