const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3747;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readJSON(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// --- Events ---

app.get('/api/events', (req, res) => {
  res.json(readJSON('events.json'));
});

app.post('/api/events', (req, res) => {
  const events = readJSON('events.json');
  const event = {
    id: uuidv4(),
    name: req.body.name,
    date: req.body.date,       // ISO date string
    time: req.body.time || null,
    location: req.body.location || null,
    notes: req.body.notes || null,
    reminders: req.body.reminders || ['1d', '1h'],
    recurring: req.body.recurring || null,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  writeJSON('events.json', events);
  res.json(event);
});

app.put('/api/events/:id', (req, res) => {
  const events = readJSON('events.json');
  const idx = events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  events[idx] = { ...events[idx], ...req.body, id: events[idx].id };
  writeJSON('events.json', events);
  res.json(events[idx]);
});

app.delete('/api/events/:id', (req, res) => {
  let events = readJSON('events.json');
  events = events.filter(e => e.id !== req.params.id);
  writeJSON('events.json', events);
  res.json({ ok: true });
});

// --- Todos ---

app.get('/api/todos', (req, res) => {
  res.json(readJSON('todos.json'));
});

app.post('/api/todos', (req, res) => {
  const todos = readJSON('todos.json');
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
  writeJSON('todos.json', todos);
  res.json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const todos = readJSON('todos.json');
  const idx = todos.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  todos[idx] = { ...todos[idx], ...req.body, id: todos[idx].id };
  writeJSON('todos.json', todos);
  res.json(todos[idx]);
});

app.delete('/api/todos/:id', (req, res) => {
  let todos = readJSON('todos.json');
  todos = todos.filter(t => t.id !== req.params.id);
  writeJSON('todos.json', todos);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`🦌 MooseAgenda running on http://localhost:${PORT}`);
});
