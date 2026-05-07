const { v4: uuidv4 } = require('uuid');
const { getFile, putFile } = require('./_github-store');
const { requireAuth } = require('./_auth');

const FILE = 'data/events.json';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const { data: events, sha } = await getFile(FILE);

  if (req.method === 'GET') {
    return res.json(events);
  }

  if (req.method === 'POST') {
    const event = {
      id: uuidv4(),
      name: req.body.name,
      date: req.body.date,
      time: req.body.time || null,
      location: req.body.location || null,
      notes: req.body.notes || null,
      reminders: req.body.reminders || ['1d', '1h'],
      recurring: req.body.recurring || null,
      createdAt: new Date().toISOString(),
    };
    events.push(event);
    await putFile(FILE, events, sha);
    return res.json(event);
  }

  const id = req.url.split('/').pop().split('?')[0];

  if (req.method === 'PUT') {
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    events[idx] = { ...events[idx], ...req.body, id: events[idx].id };
    await putFile(FILE, events, sha);
    return res.json(events[idx]);
  }

  if (req.method === 'DELETE') {
    const filtered = events.filter(e => e.id !== id);
    await putFile(FILE, filtered, sha);
    return res.json({ ok: true });
  }

  res.status(405).end();
};
