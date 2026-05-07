#!/usr/bin/env node
// Checks upcoming events and sends Telegram reminders via openclaw

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
const FIRED_FILE  = path.join(__dirname, 'data', 'fired-reminders.json');

const REMINDER_OFFSETS = {
  '1w':  7 * 24 * 60,
  '1d':  24 * 60,
  '1h':  60,
  '30m': 30,
};

function readJSON(p) {
  if (!fs.existsSync(p)) return p.includes('fired') ? {} : [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJSON(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function sendTelegram(msg) {
  const escaped = msg.replace(/'/g, "'\\''");
  try {
    execSync(`openclaw send telegram 7500646638 '${escaped}'`, { stdio: 'pipe' });
    console.log('[reminder] sent:', msg.slice(0, 60));
  } catch (e) {
    console.error('[reminder] send failed:', e.message);
  }
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`;
}

function fmtDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function minutesUntilEvent(event) {
  const now = new Date();
  const [y, m, d] = event.date.split('-').map(Number);
  const [hh, mm] = event.time ? event.time.split(':').map(Number) : [0, 0];
  const eventTime = new Date(y, m - 1, d, hh, mm);
  return Math.floor((eventTime - now) / 60000);
}

function buildMessage(event, offsetKey) {
  const timeStr = event.time ? ` at ${fmtTime(event.time)}` : '';
  const locStr  = event.location ? `\n📍 ${event.location}` : '';
  const noteStr = event.notes ? `\n📝 ${event.notes}` : '';
  const labels  = { '1w': 'in 1 week', '1d': 'tomorrow', '1h': 'in 1 hour', '30m': 'in 30 minutes' };
  const when = labels[offsetKey] || `in ${offsetKey}`;

  return `🦌 *Reminder* — ${when}!\n\n*${event.name}*\n📅 ${fmtDate(event.date)}${timeStr}${locStr}${noteStr}`;
}

function checkNewUrl() {
  const urlFile = '/tmp/moose-new-url.txt';
  if (!fs.existsSync(urlFile)) return;
  try {
    const url = fs.readFileSync(urlFile, 'utf8').trim();
    fs.unlinkSync(urlFile);
    if (url) sendTelegram(`🦌 MooseAgenda is live!\n\n👉 ${url}\n\nPassword is your usual one. Bookmark this on your phone!`);
  } catch (e) {
    console.error('[reminders] url notify failed:', e.message);
  }
}

function main() {
  checkNewUrl();
  const events = readJSON(EVENTS_FILE);
  const fired  = readJSON(FIRED_FILE);
  let changed  = false;

  for (const evt of events) {
    if (!evt.date || !evt.reminders?.length) continue;

    const minutesLeft = minutesUntilEvent(evt);
    if (minutesLeft < -60) continue; // well in the past, skip

    for (const r of evt.reminders) {
      const offsetMins = REMINDER_OFFSETS[r];
      if (!offsetMins) continue;

      const key = `${evt.id}:${r}`;
      if (fired[key]) continue;

      // Fire if we're within 5 minutes of the target offset (check runs every ~5 min)
      const diff = Math.abs(minutesLeft - offsetMins);
      if (diff <= 5 && minutesLeft >= 0) {
        sendTelegram(buildMessage(evt, r));
        fired[key] = new Date().toISOString();
        changed = true;
      }
    }
  }

  if (changed) writeJSON(FIRED_FILE, fired);
}

main();
