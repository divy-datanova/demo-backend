const User = require("../models/User");

// Creates the default email/password user from .env if it does not exist yet
const seedDefaultUser = async () => {
  const email = process.env.DEFAULT_USER_EMAIL;
  const password = process.env.DEFAULT_USER_PASSWORD;
  if (!email || !password) return;

  const exists = await User.exists({ email: email.toLowerCase() });
  if (exists) return;

  await User.create({ email, password, provider: "local" });
  console.log(`Default user created: ${email}`);
};

module.exports = seedDefaultUser;
