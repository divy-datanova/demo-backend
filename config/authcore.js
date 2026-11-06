const { createAuthCoreSso } = require("@authcore/sso-express");

// Sign-in goes through AuthCore single sign-on: this app is registered in AuthCore
// (Applications), people sign in once on AuthCore's login page (company Google account, or
// email and password), and AuthCore decides who may open it. Logging out here logs out of
// AuthCore and every app. Throws at startup if a setting is missing (see .env.example).
module.exports = createAuthCoreSso({
  authcoreUrl: process.env.AUTHCORE_URL,
  clientId: process.env.AUTHCORE_CLIENT_ID,
  clientSecret: process.env.AUTHCORE_CLIENT_SECRET,
  redirectUri: process.env.AUTHCORE_REDIRECT_URI,
  appUrl: process.env.CLIENT_URL,
  sessionSecret: process.env.SESSION_SECRET,
});
