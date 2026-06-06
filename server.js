require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getFile, putFile } = require('./api/_github-store');

const app = express();
const PORT = process.env.PORT || 3747;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res) {
  const token = req.headers['x-auth-token'];
  if (!process.env.AUTH_PASSWORD || token !== process.env.AUTH_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.post('/api/auth', (req, res) => {
  const { password } = req.body || {};
  if (password === process.env.AUTH_PASSWORD) return res.json({ ok: true, token: password });
  return res.status(401).json({ error: 'Wrong password' });
});

// --- Events ---

app.get('/api/events', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { data } = await getFile('data/events.json');
  res.json(data);
});

app.post('/api/events', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { data: events, sha } = await getFile('data/events.json');
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
  await putFile('data/events.json', events, sha);
  res.json(event);
});

app.put('/api/events/:id', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { data: events, sha } = await getFile('data/events.json');
  const idx = events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  events[idx] = { ...events[idx], ...req.body, id: events[idx].id };
  await putFile('data/events.json', events, sha);
  res.json(events[idx]);
});

app.delete('/api/events/:id', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { data: events, sha } = await getFile('data/events.json');
  const filtered = events.filter(e => e.id !== req.params.id);
  await putFile('data/events.json', filtered, sha);
  res.json({ ok: true });
});

// --- Todos ---

app.get('/api/todos', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { data } = await getFile('data/todos.json');
  res.json(data);
});

app.post('/api/todos', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { data: todos, sha } = await getFile('data/todos.json');
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
  await putFile('data/todos.json', todos, sha);
  res.json(todo);
});

app.put('/api/todos/:id', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { data: todos, sha } = await getFile('data/todos.json');
  const idx = todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  todos[idx] = { ...todos[idx], ...req.body, id: todos[idx].id };
  await putFile('data/todos.json', todos, sha);
  res.json(todos[idx]);
});

app.delete('/api/todos/:id', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { data: todos, sha } = await getFile('data/todos.json');
  const filtered = todos.filter(t => t.id !== req.params.id);
  await putFile('data/todos.json', filtered, sha);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`MooseAgenda running on port ${PORT}`);
});
