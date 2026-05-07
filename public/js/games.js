/* ═══════════════════════════════════════
   MooseAgenda — Games
   ═══════════════════════════════════════ */

const area = document.getElementById('gameArea');
let currentGame = 'whack';

document.querySelectorAll('.game-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentGame = tab.dataset.game;
    stopAll();
    render(currentGame);
  });
});

function stopAll() {
  clearAllTimers();
  area.innerHTML = '';
}

const timers = [];
function addTimer(fn, ms) { timers.push(setTimeout(fn, ms)); return timers[timers.length-1]; }
function addInterval(fn, ms) { timers.push(setInterval(fn, ms)); return timers[timers.length-1]; }
function clearAllTimers() { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers.length = 0; }

function render(game) {
  if (game === 'whack') renderWhack();
  else if (game === 'memory') renderMemory();
  else if (game === 'dash') renderDash();
}

render('whack');

/* ════════════════════════════════════════
   WHACK-A-PEST
   30 seconds, click the pests to score
   ════════════════════════════════════════ */
function renderWhack() {
  const PESTS = ['🐛','🐜','🦟','🐞','🪲'];
  const DURATION = 30;
  let score = 0, misses = 0, active = null, timeLeft = DURATION, running = false;

  area.innerHTML = `
    <div class="game-score">Score: <span id="wScore">0</span> &nbsp; Misses: <span id="wMiss">0</span> &nbsp; Time: <span id="wTime">30</span>s</div>
    <div class="timer-bar"><div class="timer-fill" id="wTimer" style="width:100%"></div></div>
    <div class="wap-grid" id="wGrid"></div>
    <button class="btn btn-primary game-btn" id="wStart">Start</button>
    <div style="font-size:12px;color:var(--text-muted);margin-top:10px">Click the pests before they escape! Don't click the moose 🦌</div>
  `;

  const grid = document.getElementById('wGrid');
  const holes = [];
  for (let i = 0; i < 9; i++) {
    const h = document.createElement('div');
    h.className = 'wap-hole';
    h.dataset.i = i;
    h.textContent = '🌿';
    h.addEventListener('click', () => {
      if (!running) return;
      if (active === i) {
        if (h.dataset.isPest === 'true') {
          score++;
          h.classList.add('whacked');
          document.getElementById('wScore').textContent = score;
          setTimeout(() => { h.classList.remove('whacked'); h.textContent = '🌿'; h.dataset.isPest = ''; }, 200);
          active = null;
        } else {
          // clicked the moose — penalty
          misses += 2;
          document.getElementById('wMiss').textContent = misses;
          h.style.background = 'var(--red)';
          setTimeout(() => { h.style.background = ''; h.textContent = '🌿'; }, 300);
          active = null;
        }
      } else {
        misses++;
        document.getElementById('wMiss').textContent = misses;
      }
    });
    grid.appendChild(h);
    holes.push(h);
  }

  function popPest() {
    if (!running) return;
    const mooseChance = Math.random() < 0.15;
    const idx = Math.floor(Math.random() * 9);
    const h = holes[idx];
    const emoji = mooseChance ? '🦌' : PESTS[Math.floor(Math.random() * PESTS.length)];
    h.textContent = emoji;
    h.dataset.isPest = mooseChance ? 'false' : 'true';
    h.classList.add('active');
    active = idx;
    const delay = Math.max(600, 1200 - (DURATION - timeLeft) * 15);
    addTimer(() => {
      if (active === idx) {
        h.textContent = '🌿';
        h.dataset.isPest = '';
        h.classList.remove('active');
        active = null;
      }
      if (running) popPest();
    }, delay);
  }

  document.getElementById('wStart').addEventListener('click', () => {
    score = 0; misses = 0; timeLeft = DURATION; running = true;
    document.getElementById('wScore').textContent = 0;
    document.getElementById('wMiss').textContent = 0;
    document.getElementById('wStart').disabled = true;
    document.getElementById('wStart').textContent = 'Running…';
    popPest();
    const tick = addInterval(() => {
      timeLeft--;
      document.getElementById('wTime').textContent = timeLeft;
      document.getElementById('wTimer').style.width = (timeLeft / DURATION * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(tick);
        running = false;
        active = null;
        holes.forEach(h => { h.textContent = '🌿'; h.classList.remove('active'); });
        const final = score - misses;
        document.getElementById('wStart').disabled = false;
        document.getElementById('wStart').textContent = `Play Again (${final > 0 ? '+'+final : final} pts)`;
        area.insertAdjacentHTML('beforeend', `<div style="color:var(--amber);font-weight:700;font-size:18px;margin-top:8px">${scoreMsg(final)}</div>`);
      }
    }, 1000);
  });
}

function scoreMsg(s) {
  if (s >= 20) return `🏆 Legend! ${s} pts`;
  if (s >= 10) return `🦌 Big moves! ${s} pts`;
  if (s >= 5) return `🌿 Decent grazing. ${s} pts`;
  return `🐌 Try harder, big moose. ${s} pts`;
}

/* ════════════════════════════════════════
   ANTLER MEMORY
   Match pairs of moose-themed cards
   ════════════════════════════════════════ */
function renderMemory() {
  const ICONS = ['🦌','🌲','🍂','🐺','🌿','🍄','🐦','🌊'];
  let cards = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
  let flipped = [], matched = new Set(), moves = 0, lock = false;

  area.innerHTML = `
    <div class="game-score">Moves: <span id="mMoves">0</span> &nbsp; Matched: <span id="mMatched">0</span>/8</div>
    <div class="mem-grid" id="mGrid"></div>
    <button class="btn btn-ghost game-btn" id="mRestart" style="display:none">Play Again</button>
  `;

  const grid = document.getElementById('mGrid');
  const els = [];

  cards.forEach((icon, i) => {
    const card = document.createElement('div');
    card.className = 'mem-card face-down';
    card.dataset.icon = icon;
    card.dataset.i = i;
    card.addEventListener('click', () => {
      if (lock || matched.has(i) || flipped.includes(i)) return;
      card.textContent = icon;
      card.classList.remove('face-down');
      card.classList.add('flipped');
      flipped.push(i);

      if (flipped.length === 2) {
        moves++;
        document.getElementById('mMoves').textContent = moves;
        lock = true;
        const [a, b] = flipped;
        if (cards[a] === cards[b]) {
          matched.add(a); matched.add(b);
          els[a].classList.add('matched');
          els[b].classList.add('matched');
          document.getElementById('mMatched').textContent = matched.size / 2;
          flipped = [];
          lock = false;
          if (matched.size === cards.length) {
            addTimer(() => {
              area.insertAdjacentHTML('beforeend', `<div style="color:var(--amber);font-weight:700;font-size:18px;margin-top:8px">🏆 All matched in ${moves} moves!</div>`);
              document.getElementById('mRestart').style.display = 'inline-block';
            }, 300);
          }
        } else {
          addTimer(() => {
            els[a].textContent = '';
            els[b].textContent = '';
            els[a].classList.remove('flipped');
            els[b].classList.remove('flipped');
            els[a].classList.add('face-down');
            els[b].classList.add('face-down');
            flipped = [];
            lock = false;
          }, 900);
        }
      }
    });
    grid.appendChild(card);
    els.push(card);
  });

  document.getElementById('mRestart').addEventListener('click', () => {
    stopAll();
    renderMemory();
  });
}

/* ════════════════════════════════════════
   MOOSE DASH
   Dodge the trees — tap/space to jump
   ════════════════════════════════════════ */
function renderDash() {
  area.innerHTML = `
    <div class="game-score">Score: <span id="dScore">0</span> &nbsp; Best: <span id="dBest">${localStorage.getItem('mooseDashBest')||0}</span></div>
    <canvas id="dashCanvas" width="560" height="200"></canvas>
    <div style="font-size:12px;color:var(--text-muted);margin-top:10px">Space / tap to jump. Double-jump available!</div>
  `;

  const canvas = document.getElementById('dashCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GROUND = H - 40;

  let score = 0, best = parseInt(localStorage.getItem('mooseDashBest')) || 0;
  let running = false, gameOver = false;
  let raf;

  const moose = { x: 80, y: GROUND, vy: 0, jumps: 0, w: 32, h: 40 };
  let obstacles = [];
  let frame = 0, speed = 4;

  function jump() {
    if (!running) { start(); return; }
    if (moose.jumps < 2) { moose.vy = -12; moose.jumps++; }
  }

  function start() {
    running = true; gameOver = false;
    score = 0; obstacles = []; frame = 0; speed = 4;
    moose.y = GROUND; moose.vy = 0; moose.jumps = 0;
    loop();
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    frame++;
    ctx.clearRect(0, 0, W, H);

    // ground
    ctx.fillStyle = '#2e4032';
    ctx.fillRect(0, GROUND + moose.h, W, H - GROUND - moose.h);

    // score
    score++;
    if (frame % 400 === 0) speed += 0.5;
    document.getElementById('dScore').textContent = Math.floor(score / 10);

    // moose physics
    moose.vy += 0.7;
    moose.y += moose.vy;
    if (moose.y >= GROUND) { moose.y = GROUND; moose.vy = 0; moose.jumps = 0; }

    // draw moose
    ctx.font = `${moose.h}px serif`;
    ctx.fillText('🦌', moose.x - moose.w / 2, moose.y + moose.h);

    // spawn obstacles
    const last = obstacles[obstacles.length - 1];
    const minGap = Math.max(180, 300 - speed * 8);
    if (!last || W - last.x > minGap + Math.random() * 120) {
      const tall = Math.random() < 0.4;
      obstacles.push({ x: W + 20, h: tall ? 60 : 40, w: 22 });
    }

    // move + draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed;
      ctx.font = `${o.h}px serif`;
      ctx.fillText('🌲', o.x, GROUND + moose.h);

      // collision
      const mx = moose.x, my = moose.y + 8;
      if (mx + moose.w - 10 > o.x + 6 && mx + 4 < o.x + o.w && my + moose.h - 10 > GROUND) {
        endGame();
        return;
      }
      if (o.x < -40) obstacles.splice(i, 1);
    }

    // stars
    if (frame % 3 === 0) {
      ctx.fillStyle = 'rgba(214,232,216,0.3)';
      for (let s = 0; s < 2; s++) {
        ctx.fillRect(Math.random() * W, Math.random() * (GROUND - 20), 2, 2);
      }
    }
  }

  function endGame() {
    running = false;
    cancelAnimationFrame(raf);
    gameOver = true;
    const pts = Math.floor(score / 10);
    if (pts > best) { best = pts; localStorage.setItem('mooseDashBest', best); }
    document.getElementById('dBest').textContent = best;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d6e8d8';
    ctx.font = 'bold 24px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💥 Timber!', W/2, H/2 - 16);
    ctx.font = '16px Space Grotesk, sans-serif';
    ctx.fillStyle = '#e8a84c';
    ctx.fillText(`Score: ${pts}  Best: ${best}`, W/2, H/2 + 14);
    ctx.fillStyle = '#7a9e80';
    ctx.font = '13px Space Grotesk, sans-serif';
    ctx.fillText('Space / tap to restart', W/2, H/2 + 38);
    ctx.textAlign = 'left';
  }

  // Controls
  document.addEventListener('keydown', function handler(e) {
    if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); jump(); }
    // cleanup when leaving this game
    if (!document.getElementById('dashCanvas')) document.removeEventListener('keydown', handler);
  });
  canvas.addEventListener('click', jump);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); }, { passive: false });

  // Draw start screen
  ctx.fillStyle = '#2e4032';
  ctx.fillRect(0, GROUND + moose.h, W, H - GROUND - moose.h);
  ctx.font = `${moose.h}px serif`;
  ctx.fillText('🦌', moose.x - moose.w / 2, moose.y + moose.h);
  ctx.fillStyle = '#d6e8d8';
  ctx.font = 'bold 20px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Space / tap to start', W/2, H/2);
  ctx.textAlign = 'left';
}
