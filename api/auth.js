module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body || {};
  const expected = process.env.AUTH_PASSWORD;

  if (!expected) return res.status(500).json({ error: 'Auth not configured' });
  if (password === expected) return res.json({ ok: true, token: password });
  return res.status(401).json({ error: 'Wrong password' });
};
