// Validates the auth token on incoming requests
function requireAuth(req, res) {
  const token = req.headers['x-auth-token'] || req.query._token;
  const expected = process.env.AUTH_PASSWORD;
  if (!expected || token !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

module.exports = { requireAuth };
