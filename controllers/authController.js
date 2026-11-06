// GET /api/auth/me  (protected) - the signed-in user as AuthCore describes them: { id, name, email, role }
const getMe = (req, res) => {
  res.json({ user: req.user });
};

module.exports = { getMe };
