const express = require("express");
const { login, googleAuth, googleCallback, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.get("/me", protect, getMe);

module.exports = router;
