const { v4: uuidv4 } = require('uuid');
const { getFile, putFile } = require('./_github-store');
const { requireAuth } = require('./_auth');

const FILE = 'data/todos.json';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const { data: todos, sha } = await getFile(FILE);

  if (req.method === 'GET') {
    return res.json(todos);
  }

  if (req.method === 'POST') {
    const todo = {
      id: uuidv4(),
      text: req.body.text,
      priority: req.body.priority || 'grazing',
      dueDate: req.body.dueDate || null,
      eventId: req.body.eventId || null,
      done: false,
      createdAt: new Date().toISOString(),
    };
    todos.push(todo);
    await putFile(FILE, todos, sha);
    return res.json(todo);
  }

  const id = req.url.split('/').pop().split('?')[0];

  if (req.method === 'PUT') {
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    todos[idx] = { ...todos[idx], ...req.body, id: todos[idx].id };
    await putFile(FILE, todos, sha);
    return res.json(todos[idx]);
  }

  if (req.method === 'DELETE') {
    const filtered = todos.filter(t => t.id !== id);
    await putFile(FILE, filtered, sha);
    return res.json({ ok: true });
  }

  res.status(405).end();
};
