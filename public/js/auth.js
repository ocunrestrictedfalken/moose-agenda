/* Auth gate — runs before app.js */
(function () {
  const TOKEN_KEY = 'moose_auth_token';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  // Expose token getter for API calls
  window.authToken = getToken;

  async function verifyToken(token) {
    if (!token) return false;
    // Test the token against a real API endpoint
    try {
      const r = await fetch('/api/events', { headers: { 'x-auth-token': token } });
      return r.ok;
    } catch { return false; }
  }

  async function init() {
    const gate = document.getElementById('authGate');
    const app  = document.getElementById('mainApp');
    const form = document.getElementById('authForm');
    const input = document.getElementById('authInput');
    const err  = document.getElementById('authErr');

    const existing = getToken();
    if (existing && await verifyToken(existing)) {
      gate.style.display = 'none';
      app.style.display  = 'flex';
      return;
    }

    clearToken();
    gate.style.display = 'flex';
    app.style.display  = 'none';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.style.display = 'none';
      const pw = input.value.trim();
      const r  = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) {
        setToken(pw);
        gate.style.display = 'none';
        app.style.display  = 'flex';
      } else {
        err.style.display = 'block';
        input.value = '';
        input.focus();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
