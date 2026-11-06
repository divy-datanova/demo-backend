const express = require("express");
const authcore = require("../config/authcore");
const { getMe } = require("../controllers/authController");

const router = express.Router();

// GET /login, GET /callback, POST /logout and POST /backchannel-logout (AuthCore's logout
// notices, server to server): sign-in and logout through AuthCore
router.use(authcore.routes);
router.get("/me", authcore.requireAuth, getMe);

module.exports = router;
