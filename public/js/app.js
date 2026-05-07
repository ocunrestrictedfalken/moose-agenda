/* ═══════════════════════════════════════
   MooseAgenda — Frontend App
   ═══════════════════════════════════════ */

const API = '';
let events = [], todos = [];
let calendarDate = new Date();
let calMode = 'month';
let todoFilter = 'all';
let editingEventId = null, editingTodoId = null;

const PRIORITY_META = {
  'on-fire':    { emoji: '🔥', label: 'On Fire',    order: 0 },
  'high-ground':{ emoji: '🦌', label: 'High Ground', order: 1 },
  'grazing':    { emoji: '🌿', label: 'Grazing',     order: 2 },
  'eventually': { emoji: '🐌', label: 'Eventually',  order: 3 },
};

// ─── Init ───────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateSidebarDate();
  await refresh();
  renderMiniCal();
  renderCalendar();
  bindNav();
  bindModals();
  bindForms();
  bindFilters();
});

async function refresh() {
  [events, todos] = await Promise.all([fetchEvents(), fetchTodos()]);
  renderDashboard();
  renderFullTodos();
  renderCalendar();
  renderMiniCal();
}

// ─── API ────────────────────────────────
function authHeaders(extra) {
  return { 'Content-Type': 'application/json', 'x-auth-token': window.authToken?.() || '', ...extra };
}

async function fetchEvents() {
  const r = await fetch(`${API}/api/events`, { headers: authHeaders() });
  return r.json();
}
async function fetchTodos() {
  const r = await fetch(`${API}/api/todos`, { headers: authHeaders() });
  return r.json();
}
async function saveEvent(data, id) {
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API}/api/events/${id}` : `${API}/api/events`;
  const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) });
  return r.json();
}
async function deleteEvent(id) {
  await fetch(`${API}/api/events/${id}`, { method: 'DELETE', headers: authHeaders() });
}
async function saveTodo(data, id) {
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API}/api/todos/${id}` : `${API}/api/todos`;
  const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) });
  return r.json();
}
async function deleteTodo(id) {
  await fetch(`${API}/api/todos/${id}`, { method: 'DELETE', headers: authHeaders() });
}

// ─── Sidebar Date ───────────────────────
function updateSidebarDate() {
  const el = document.getElementById('sidebarDate');
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}

// ─── Navigation ─────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
      if (btn.dataset.view === 'calendar') renderCalendar();
    });
  });

  // Calendar nav
  document.getElementById('calPrev').addEventListener('click', () => {
    if (calMode === 'month') calendarDate.setMonth(calendarDate.getMonth() - 1);
    else calendarDate.setDate(calendarDate.getDate() - 7);
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    if (calMode === 'month') calendarDate.setMonth(calendarDate.getMonth() + 1);
    else calendarDate.setDate(calendarDate.getDate() + 7);
    renderCalendar();
  });

  document.querySelectorAll('.cal-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cal-mode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calMode = btn.dataset.mode;
      renderCalendar();
    });
  });
}

// ─── Dashboard ──────────────────────────
function renderDashboard() {
  const today = todayStr();
  const todayEvts = events.filter(e => e.date === today).sort(sortByTime);
  const upcoming = events
    .filter(e => e.date > today)
    .sort((a,b) => a.date.localeCompare(b.date) || sortByTime(a,b))
    .slice(0, 5);

  const incompleteTodos = todos
    .filter(t => !t.done)
    .sort((a,b) => PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order)
    .slice(0, 8);

  const todayEl = document.getElementById('todayEvents');
  const todayEmpty = document.getElementById('todayEmpty');
  todayEl.innerHTML = '';
  todayEmpty.style.display = todayEvts.length ? 'none' : 'flex';
  todayEvts.forEach(e => todayEl.appendChild(makeEventEl(e)));

  const upcomingEl = document.getElementById('upcomingEvents');
  const upcomingEmpty = document.getElementById('upcomingEmpty');
  upcomingEl.innerHTML = '';
  upcomingEmpty.style.display = upcoming.length ? 'none' : 'flex';
  upcoming.forEach(e => upcomingEl.appendChild(makeEventEl(e, true)));

  const todosEl = document.getElementById('dashTodos');
  const todosEmpty = document.getElementById('todosEmpty');
  todosEl.innerHTML = '';
  todosEmpty.style.display = incompleteTodos.length ? 'none' : 'flex';
  incompleteTodos.forEach(t => todosEl.appendChild(makeTodoEl(t)));
}

function sortByTime(a, b) {
  if (!a.time && !b.time) return 0;
  if (!a.time) return 1;
  if (!b.time) return -1;
  return a.time.localeCompare(b.time);
}

function makeEventEl(evt, showDate = false) {
  const div = document.createElement('div');
  div.className = 'event-item fade-in';
  div.innerHTML = `
    <div class="event-item-name">${esc(evt.name)}</div>
    <div class="event-item-meta">
      ${showDate ? `<span class="event-meta-chip">📅 ${fmtDate(evt.date)}</span>` : ''}
      ${evt.time ? `<span class="event-meta-chip">🕐 ${fmtTime(evt.time)}</span>` : ''}
      ${evt.location ? `<span class="event-meta-chip">📍 ${esc(evt.location)}</span>` : ''}
    </div>
  `;
  div.addEventListener('click', () => openEventModal(evt));
  return div;
}

function makeTodoEl(todo) {
  const div = document.createElement('div');
  div.className = `todo-item fade-in${todo.done ? ' done' : ''}`;
  const overdue = todo.dueDate && todo.dueDate < todayStr() && !todo.done;
  div.innerHTML = `
    <button class="todo-check${todo.done ? ' checked' : ''}" data-id="${todo.id}">${todo.done ? '✓' : ''}</button>
    <span class="todo-text">${esc(todo.text)}</span>
    <span class="todo-priority">${PRIORITY_META[todo.priority]?.emoji || ''}</span>
    ${todo.dueDate ? `<span class="todo-due${overdue ? ' overdue' : ''}">${fmtDate(todo.dueDate)}</span>` : ''}
    <button class="todo-edit-btn" data-id="${todo.id}">✎</button>
  `;
  div.querySelector('.todo-check').addEventListener('click', async (e) => {
    e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    const t = todos.find(x => x.id === id);
    if (t.done === false) spawnLeaf(e.currentTarget);
    await saveTodo({ done: !t.done }, id);
    await refresh();
  });
  div.querySelector('.todo-edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openTodoModal(todo);
  });
  return div;
}

// ─── Full Todos View ─────────────────────
function renderFullTodos() {
  let filtered = todos;
  if (todoFilter !== 'all') filtered = todos.filter(t => t.priority === todoFilter);
  const sorted = [...filtered].sort((a,b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order;
  });
  const el = document.getElementById('fullTodoList');
  el.innerHTML = '';
  sorted.forEach(t => el.appendChild(makeTodoEl(t)));
  if (sorted.length === 0) {
    el.innerHTML = `<div class="empty-state"><span class="empty-icon">🍃</span><p>Nothing here, big moose</p></div>`;
  }
}

function bindFilters() {
  document.querySelectorAll('.priority-filter .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.priority-filter .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      todoFilter = btn.dataset.filter;
      renderFullTodos();
    });
  });
}

// ─── Calendar ───────────────────────────
function renderCalendar() {
  const titleEl = document.getElementById('calTitle');
  const gridEl = document.getElementById('calendarGrid');
  gridEl.innerHTML = '';

  if (calMode === 'month') renderMonthView(titleEl, gridEl);
  else renderWeekView(titleEl, gridEl);
}

function renderMonthView(titleEl, gridEl) {
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  titleEl.textContent = new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const header = document.createElement('div');
  header.className = 'cal-week-header';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const lbl = document.createElement('div');
    lbl.className = 'cal-week-label';
    lbl.textContent = d;
    header.appendChild(lbl);
  });
  gridEl.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cal-body';

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();
  const today = todayStr();

  for (let i = 0; i < 42; i++) {
    let day, month = m, year = y, otherMonth = false;
    if (i < firstDay) {
      day = daysInPrev - firstDay + i + 1;
      month = m - 1; otherMonth = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      month = m + 1; otherMonth = true;
    } else {
      day = i - firstDay + 1;
    }

    const cellDate = new Date(year, month, day);
    const dateStr = dateToStr(cellDate);
    const cellEvts = events.filter(e => e.date === dateStr);
    const isToday = dateStr === today;

    const cell = document.createElement('div');
    cell.className = `cal-cell${isToday ? ' today' : ''}${otherMonth ? ' other-month' : ''}`;
    cell.innerHTML = `<div class="cal-cell-num">${day}</div>`;

    cellEvts.slice(0, 3).forEach(evt => {
      const pill = document.createElement('div');
      pill.className = 'cal-event-pill';
      pill.textContent = (evt.time ? fmtTime(evt.time) + ' ' : '') + evt.name;
      pill.addEventListener('click', (e) => { e.stopPropagation(); openEventModal(evt); });
      cell.appendChild(pill);
    });
    if (cellEvts.length > 3) {
      const more = document.createElement('div');
      more.className = 'cal-event-pill';
      more.style.background = 'var(--bg4)';
      more.style.color = 'var(--text-muted)';
      more.textContent = `+${cellEvts.length - 3} more`;
      cell.appendChild(more);
    }

    cell.addEventListener('click', () => openEventModal(null, dateStr));
    body.appendChild(cell);
  }
  gridEl.appendChild(body);
}

function renderWeekView(titleEl, gridEl) {
  const startOfWeek = new Date(calendarDate);
  startOfWeek.setDate(calendarDate.getDate() - calendarDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  titleEl.textContent = `${fmtDate(dateToStr(startOfWeek))} – ${fmtDate(dateToStr(endOfWeek))}`;

  const header = document.createElement('div');
  header.className = 'cal-week-header';
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const lbl = document.createElement('div');
    lbl.className = 'cal-week-label';
    lbl.textContent = `${days[i]} ${d.getDate()}`;
    header.appendChild(lbl);
  }
  gridEl.appendChild(header);

  const body = document.createElement('div');
  body.className = 'cal-body';
  body.style.minHeight = '300px';
  const today = todayStr();

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = dateToStr(d);
    const cellEvts = events.filter(e => e.date === dateStr).sort(sortByTime);

    const cell = document.createElement('div');
    cell.className = `cal-cell${dateStr === today ? ' today' : ''}`;
    cell.style.minHeight = '200px';
    cell.innerHTML = `<div class="cal-cell-num"></div>`;
    cellEvts.forEach(evt => {
      const pill = document.createElement('div');
      pill.className = 'cal-event-pill';
      pill.textContent = (evt.time ? fmtTime(evt.time) + ' ' : '') + evt.name;
      pill.addEventListener('click', (e) => { e.stopPropagation(); openEventModal(evt); });
      cell.appendChild(pill);
    });
    cell.addEventListener('click', () => openEventModal(null, dateStr));
    body.appendChild(cell);
  }
  gridEl.appendChild(body);
}

// ─── Mini Calendar ──────────────────────
function renderMiniCal() {
  const el = document.getElementById('miniCal');
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const today = todayStr();
  const eventDates = new Set(events.map(e => e.date));

  el.innerHTML = `
    <div class="mini-cal-header">
      <span>${now.toLocaleDateString('en-US',{month:'short',year:'numeric'})}</span>
    </div>
    <div class="mini-cal-grid">
      ${['S','M','T','W','T','F','S'].map(d => `<div class="mini-cal-day-label">${d}</div>`).join('')}
    </div>
  `;
  const grid = el.querySelector('.mini-cal-grid');

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    grid.appendChild(blank);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const div = document.createElement('div');
    div.className = `mini-cal-day${dateStr === today ? ' today' : ''}${eventDates.has(dateStr) ? ' has-event' : ''}`;
    div.textContent = d;
    grid.appendChild(div);
  }
}

// ─── Event Modal ─────────────────────────
function bindModals() {
  document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());
  document.getElementById('addEventBtn2').addEventListener('click', () => openEventModal());
  document.getElementById('addTodoBtn').addEventListener('click', () => openTodoModal());
  document.getElementById('addTodoBtn2').addEventListener('click', () => openTodoModal());
  document.getElementById('closeEventModal').addEventListener('click', closeEventModal);
  document.getElementById('closeTodoModal').addEventListener('click', closeTodoModal);
  document.getElementById('eventModal').addEventListener('click', (e) => { if (e.target.id === 'eventModal') closeEventModal(); });
  document.getElementById('todoModal').addEventListener('click', (e) => { if (e.target.id === 'todoModal') closeTodoModal(); });

  document.getElementById('deleteEventBtn').addEventListener('click', async () => {
    if (editingEventId && confirm('Delete this event?')) {
      await deleteEvent(editingEventId);
      closeEventModal();
      await refresh();
    }
  });
  document.getElementById('deleteTodoBtn').addEventListener('click', async () => {
    if (editingTodoId && confirm('Delete this to-do?')) {
      await deleteTodo(editingTodoId);
      closeTodoModal();
      await refresh();
    }
  });

  // Reminder chip toggles
  document.querySelectorAll('#reminderChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.dataset.val === 'none') {
        document.querySelectorAll('#reminderChips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      } else {
        document.querySelector('#reminderChips .chip[data-val="none"]').classList.remove('active');
        chip.classList.toggle('active');
      }
    });
  });

  // Priority buttons
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function openEventModal(evt = null, defaultDate = null) {
  editingEventId = evt?.id || null;
  const form = document.getElementById('eventForm');
  form.reset();
  document.getElementById('eventModalTitle').textContent = evt ? 'Edit Event' : 'New Event';
  document.getElementById('deleteEventBtn').style.display = evt ? 'block' : 'none';

  // Reset chips
  document.querySelectorAll('#reminderChips .chip').forEach(c => c.classList.remove('active'));
  document.querySelector('#reminderChips .chip[data-val="1d"]').classList.add('active');
  document.querySelector('#reminderChips .chip[data-val="1h"]').classList.add('active');

  if (evt) {
    document.getElementById('eventId').value = evt.id;
    document.getElementById('eventName').value = evt.name;
    document.getElementById('eventDate').value = evt.date;
    document.getElementById('eventTime').value = evt.time || '';
    document.getElementById('eventLocation').value = evt.location || '';
    document.getElementById('eventNotes').value = evt.notes || '';
    if (evt.reminders) {
      document.querySelectorAll('#reminderChips .chip').forEach(c => c.classList.remove('active'));
      evt.reminders.forEach(r => {
        const chip = document.querySelector(`#reminderChips .chip[data-val="${r}"]`);
        if (chip) chip.classList.add('active');
      });
    }
  } else if (defaultDate) {
    document.getElementById('eventDate').value = defaultDate;
  } else {
    document.getElementById('eventDate').value = todayStr();
  }

  document.getElementById('eventModal').classList.add('open');
  document.getElementById('eventName').focus();
}

function closeEventModal() {
  document.getElementById('eventModal').classList.remove('open');
  editingEventId = null;
}

function openTodoModal(todo = null) {
  editingTodoId = todo?.id || null;
  document.getElementById('todoForm').reset();
  document.getElementById('todoModalTitle').textContent = todo ? 'Edit To-Do' : 'New To-Do';
  document.getElementById('deleteTodoBtn').style.display = todo ? 'block' : 'none';
  document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.priority-btn[data-p="grazing"]').classList.add('active');

  if (todo) {
    document.getElementById('todoId').value = todo.id;
    document.getElementById('todoText').value = todo.text;
    document.getElementById('todoDue').value = todo.dueDate || '';
    document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
    const pb = document.querySelector(`.priority-btn[data-p="${todo.priority}"]`);
    if (pb) pb.classList.add('active');
  }

  document.getElementById('todoModal').classList.add('open');
  document.getElementById('todoText').focus();
}

function closeTodoModal() {
  document.getElementById('todoModal').classList.remove('open');
  editingTodoId = null;
}

// ─── Forms ──────────────────────────────
function bindForms() {
  document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const activeChips = [...document.querySelectorAll('#reminderChips .chip.active')].map(c => c.dataset.val);
    const reminders = activeChips.includes('none') ? [] : activeChips;
    const data = {
      name: document.getElementById('eventName').value.trim(),
      date: document.getElementById('eventDate').value,
      time: document.getElementById('eventTime').value || null,
      location: document.getElementById('eventLocation').value.trim() || null,
      notes: document.getElementById('eventNotes').value.trim() || null,
      reminders,
    };
    await saveEvent(data, editingEventId);
    closeEventModal();
    await refresh();
  });

  document.getElementById('todoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const priority = document.querySelector('.priority-btn.active')?.dataset.p || 'grazing';
    const data = {
      text: document.getElementById('todoText').value.trim(),
      priority,
      dueDate: document.getElementById('todoDue').value || null,
    };
    await saveTodo(data, editingTodoId);
    closeTodoModal();
    await refresh();
  });
}

// ─── Fun: Leaf confetti on todo complete ─
function spawnLeaf(el) {
  const emojis = ['🍃','🌿','✨','🦌'];
  const rect = el.getBoundingClientRect();
  for (let i = 0; i < 4; i++) {
    const leaf = document.createElement('div');
    leaf.className = 'confetti';
    leaf.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    leaf.style.left = (rect.left + Math.random() * 30 - 10) + 'px';
    leaf.style.top = rect.top + 'px';
    leaf.style.animationDelay = (i * 0.08) + 's';
    document.body.appendChild(leaf);
    setTimeout(() => leaf.remove(), 900);
  }
}

// ─── Helpers ────────────────────────────
function todayStr() {
  return dateToStr(new Date());
}
function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDate(str) {
  if (!str) return '';
  const [y,m,d] = str.split('-');
  return new Date(y, m-1, d).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  const [h,m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')}${ampm}`;
}
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
