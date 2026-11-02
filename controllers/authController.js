const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const STATE_COOKIE = "google_oauth_state";

const signToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

const isGoogleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);

const getGoogleClient = () =>
  new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CALLBACK_URL,
  });

const getCookie = (req, name) =>
  (req.headers.cookie || "")
    .split(";")
    .map((pair) => pair.trim().split("="))
    .find(([key]) => key === name)?.[1];

// Sends the browser back to the frontend with either { token } or { error } in the URL hash
const redirectToClient = (res, params) =>
  res.redirect(`${process.env.CLIENT_URL}/auth/callback#${new URLSearchParams(params)}`);

// POST /api/auth/login  { email, password }
const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");
  if (!user || !(await user.comparePassword(String(password)))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({ token: signToken(user), user: user.toPublicJSON() });
};

// GET /api/auth/google  - starts Google login by redirecting to Google's consent screen
const googleAuth = (req, res) => {
  if (!isGoogleConfigured()) {
    return redirectToClient(res, { error: "Google login is not configured on the server" });
  }

  // Random state stored in a cookie protects the callback against CSRF
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
    path: "/api/auth/google",
  });

  const url = getGoogleClient().generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
  res.redirect(url);
};

// GET /api/auth/google/callback  - Google redirects here with ?code=...&state=...
const googleCallback = async (req, res) => {
  const { code, state, error } = req.query;
  const savedState = getCookie(req, STATE_COOKIE);
  res.clearCookie(STATE_COOKIE, { path: "/api/auth/google" });

  if (error) {
    return redirectToClient(res, { error: "Google sign-in was cancelled" });
  }
  if (!code || !state || state !== savedState) {
    return redirectToClient(res, { error: "Invalid Google sign-in request. Please try again." });
  }

  let payload;
  try {
    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error("Google token exchange failed:", err.message);
    return redirectToClient(res, { error: "Google sign-in failed. Please try again." });
  }

  if (!payload.email || !payload.email_verified) {
    return redirectToClient(res, { error: "Your Google account email is not verified" });
  }

  // Link to an existing account with the same email, or create a new one
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });
  if (!user) {
    user = new User({ email: payload.email, provider: "google" });
  }
  user.googleId = payload.sub;
  user.name = payload.name;
  user.avatar = payload.picture;
  await user.save();

  redirectToClient(res, { token: signToken(user) });
};

// GET /api/auth/me  (protected)
const getMe = (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
};

module.exports = { login, googleAuth, googleCallback, getMe };
