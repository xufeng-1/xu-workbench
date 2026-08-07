/* panels/games.js —— 游戏：2048 / 贪吃蛇 / 记忆翻牌 / 猜数字（纯本地，无需网络） */
(function () {
  const XU = window.XU;
  const BEST_KEY = 'gameBest';

  async function getBest() {
    const r = await XU.Store.kvGet(BEST_KEY);
    return r || {};
  }
  async function saveBest(b) {
    await XU.Store.kvSet(BEST_KEY, b);
  }
  async function updateBest(key, val) {
    const b = await getBest();
    if (!b[key] || val > b[key]) { b[key] = val; await saveBest(b); }
    return b[key];
  }

  const GAMES = [
    { id: 'g2048', emoji: '🔢', name: '2048', desc: '滑动合并数字，冲击 2048' },
    { id: 'snake', emoji: '🐍', name: '贪吃蛇', desc: '经典街机，越吃越长' },
    { id: 'memory', emoji: '🃏', name: '记忆翻牌', desc: '翻牌配对，挑战最少步数' },
    { id: 'guess', emoji: '🎯', name: '猜数字', desc: '1-100 猜中它，越少步越好' },
    { id: 'tower', emoji: '🏰', name: '无限冲关', desc: '限时答题闯关，看你能冲到第几关' }
  ];

  let activeKey = null;
  window.addEventListener('keydown', (e) => { if (activeKey) activeKey(e); });

  XU.regPanel('games', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const best = await getBest();
    el.innerHTML =
      '<div class="card">' +
        '<h2>🎮 摸鱼小游戏</h2>' +
        '<p class="sub">休息时间玩两局 · 成绩自动保存本机</p>' +
        '<div class="grid2" id="gamePick">' +
          GAMES.map((g) =>
            '<button class="game-pick" data-g="' + g.id + '">' +
              '<span class="gp-emoji">' + g.emoji + '</span>' +
              '<b>' + g.name + '</b>' +
              '<i>' + g.desc + '</i>' +
              (best[g.id] ? '<em>最佳：' + best[g.id] + '</em>' : '') +
            '</button>').join('') +
        '</div>' +
        '<div id="gameBox"></div>' +
      '</div>';

    const box = XU.$('#gameBox', el);
    let current = null;

    function pickGame(id) {
      current = id;
      activeKey = null;
      XU.$$('#gamePick button', el).forEach((b) => b.classList.toggle('on', b.getAttribute('data-g') === id));
      if (id === 'g2048') { game2048(box); activeKey = keyDir2048; }
      else if (id === 'snake') { snakeGame(box); activeKey = keySnake; }
      else if (id === 'memory') memoryGame(box);
      else if (id === 'tower') towerGame(box);
      else guessGame(box);
    }

    XU.$('#gamePick', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]');
      if (b) pickGame(b.getAttribute('data-g'));
    });
    pickGame('g2048');
  });

  let keyDir2048 = null, keySnake = null;

  /* ============ 2048 ============ */
  function game2048(box) {
    let board = newBoard();
    let score = 0, over = false;
    box.innerHTML =
      '<div class="game-head"><div>得分 <b id="g2048Score">0</b></div>' +
      '<button class="btn mini ghost" id="g2048Restart">重开</button></div>' +
      '<div class="g2048" id="g2048Board"></div>' +
      '<p class="sub" style="text-align:center">← ↑ ↓ → 或 滑动屏幕</p>';
    const boardEl = XU.$('#g2048Board', box);

    function newBoard() { return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]; }
    function render() {
      boardEl.innerHTML = board.map((row, r) =>
        row.map((v, c) => '<div class="t' + v + '">' + (v || '') + '</div>').join('')).join('');
      XU.$('#g2048Score', box).textContent = score;
    }
    function spawn() {
      const empty = [];
      board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
      if (!empty.length) return;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
    function slide(row) {
      const arr = row.filter(Boolean);
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; arr.splice(i + 1, 1); }
      }
      while (arr.length < 4) arr.push(0);
      return arr;
    }
    function move(dir) {
      const before = JSON.stringify(board);
      if (dir === 0 || dir === 2) {
        board = board.map((row) => (dir === 0 ? slide(row) : slide(row.slice().reverse()).reverse()));
      } else {
        for (let c = 0; c < 4; c++) {
          const col = [0, 1, 2, 3].map((r) => board[r][c]);
          const res = dir === 1 ? slide(col) : slide(col.slice().reverse()).reverse();
          for (let r = 0; r < 4; r++) board[r][c] = res[r];
        }
      }
      if (JSON.stringify(board) === before) return;
      spawn(); render();
      if (!canMove()) over = true;
      if (over) {
        updateBest('g2048', score).then((b) => {
          XU.toast('游戏结束！得分 ' + score + '，最佳 ' + b + ' 🎮');
          box.querySelector('#g2048Restart').textContent = '再来一局';
        });
      }
    }
    function canMove() {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const v = board[r][c];
        if (!v) return true;
        if (c < 3 && board[r][c + 1] === v) return true;
        if (r < 3 && board[r + 1][c] === v) return true;
      }
      return false;
    }
    keyDir2048 = function keyDir(e) {
      const k = e.key;
      if (k === 'ArrowLeft') { e.preventDefault(); move(0); }
      else if (k === 'ArrowRight') { e.preventDefault(); move(2); }
      else if (k === 'ArrowUp') { e.preventDefault(); move(1); }
      else if (k === 'ArrowDown') { e.preventDefault(); move(3); }
    }
    let sx = 0, sy = 0;
    box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 2 : 0);
      else move(dy > 0 ? 3 : 1);
    }, { passive: true });
    XU.$('#g2048Restart', box).onclick = () => {
      board = newBoard(); score = 0; over = false;
      spawn(); spawn(); render();
      box.querySelector('#g2048Restart').textContent = '重开';
    };
    spawn(); spawn(); render();
    box._cleanup = () => window.removeEventListener('keydown', keyDir);
  }

  /* ============ 贪吃蛇 ============ */
  function snakeGame(box) {
    const SIZE = 20, CELL = 15;
    let snake = [[10, 10]], dir = [1, 0], nextDir = [1, 0];
    let food = [15, 10], score = 0, running = false, timer = null, over = false;
    box.innerHTML =
      '<div class="game-head"><div>得分 <b id="snakeScore">0</b></div>' +
      '<button class="btn mini ghost" id="snakeStart">▶ 开始</button></div>' +
      '<canvas id="snakeCanvas" width="' + SIZE * CELL + '" height="' + SIZE * CELL + '" style="width:100%;max-width:300px;aspect-ratio:1;background:#1d1b2b;border-radius:16px;display:block;margin:0 auto;touch-action:none"></canvas>' +
      '<p class="sub" style="text-align:center">← ↑ ↓ → 或 滑动屏幕</p>';
    const cv = XU.$('#snakeCanvas', box);
    const ctx = cv.getContext('2d');

    function placeFood() {
      while (true) {
        const p = [Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE)];
        if (!snake.some((s) => s[0] === p[0] && s[1] === p[1])) { food = p; return; }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, SIZE * CELL, SIZE * CELL);
      ctx.fillStyle = '#F2A24C';
      ctx.beginPath(); ctx.arc(food[0] * CELL + CELL / 2, food[1] * CELL + CELL / 2, CELL / 2 - 1, 0, 7); ctx.fill();
      snake.forEach((s, i) => {
        ctx.fillStyle = i === snake.length - 1 ? '#8B7BD8' : '#B9AEF2';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(s[0] * CELL + 1, s[1] * CELL + 1, CELL - 2, CELL - 2, 4);
        else ctx.rect(s[0] * CELL + 1, s[1] * CELL + 1, CELL - 2, CELL - 2);
        ctx.fill();
      });
    }
    function step() {
      dir = nextDir;
      const head = [snake[snake.length - 1][0] + dir[0], snake[snake.length - 1][1] + dir[1]];
      const hitWall = head[0] < 0 || head[0] >= SIZE || head[1] < 0 || head[1] >= SIZE;
      const hitSelf = snake.some((s) => s[0] === head[0] && s[1] === head[1]);
      if (hitWall || hitSelf) { end(); return; }
      snake.push(head);
      if (head[0] === food[0] && head[1] === food[1]) {
        score++; XU.$('#snakeScore', box).textContent = score;
        placeFood();
      } else snake.shift();
      draw();
    }
    function end() {
      running = false; if (timer) { clearInterval(timer); timer = null; }
      over = true;
      updateBest('snake', score).then((b) => XU.toast('游戏结束！得分 ' + score + '，最佳 ' + b + ' 🐍'));
      XU.$('#snakeStart', box).textContent = '再来一局';
    }
    function start() {
      snake = [[10, 10]]; dir = [1, 0]; nextDir = [1, 0]; score = 0; over = false;
      XU.$('#snakeScore', box).textContent = 0;
      placeFood(); draw();
      if (timer) clearInterval(timer);
      timer = setInterval(step, Math.max(90, 160 - score * 2));
      running = true;
      XU.$('#snakeStart', box).textContent = '重开';
    }
    let sx = 0, sy = 0;
    box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? [1, 0] : [-1, 0]);
      else setDir(dy > 0 ? [0, 1] : [0, -1]);
    }, { passive: true });
    function setDir(d) {
      if ((d[0] !== 0 && dir[0] === 0) || (d[1] !== 0 && dir[1] === 0)) nextDir = d;
    }
    keySnake = (e) => {
      const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (map[e.key]) { e.preventDefault(); setDir(map[e.key]); }
    };
    XU.$('#snakeStart', box).onclick = () => { if (!running || over) start(); };
    placeFood(); draw();
  }

  /* ============ 记忆翻牌 ============ */
  function memoryGame(box) {
    const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🥝', '🍉'];
    let cards = [], first = null, lock = false, moves = 0, found = 0, t0 = 0, timer = null;
    box.innerHTML =
      '<div class="game-head"><div>步数 <b id="memMoves">0</b> · 用时 <b id="memTime">0s</b></div>' +
      '<button class="btn mini ghost" id="memRestart">重开</button></div>' +
      '<div class="mem-grid" id="memGrid"></div>' +
      '<p class="sub" style="text-align:center">翻开两张，找到相同的配对</p>';
    const grid = XU.$('#memGrid', box);

    function reset() {
      cards = EMOJIS.concat(EMOJIS).map((e, i) => ({ e, i, open: false, done: false }));
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      first = null; lock = false; moves = 0; found = 0; t0 = Date.now();
      if (timer) clearInterval(timer);
      timer = setInterval(() => { XU.$('#memTime', box).textContent = Math.floor((Date.now() - t0) / 1000) + 's'; }, 500);
      render();
    }
    function render() {
      XU.$('#memMoves', box).textContent = moves;
      grid.innerHTML = cards.map((c, i) =>
        '<button class="mem-card' + (c.open || c.done ? ' on' : '') + '" data-i="' + i + '">' + (c.open || c.done ? c.e : '?') + '</button>').join('');
    }
    function flip(i) {
      const c = cards[i];
      if (lock || c.open || c.done) return;
      c.open = true; render();
      if (!first) { first = c; return; }
      moves++;
      if (first.e === c.e) {
        first.done = c.done = true; first = null; found += 2;
        if (found === cards.length) {
          if (timer) clearInterval(timer);
          const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
          updateBest('memory', -moves).then((b) => {
            XU.toast('全部配对成功！' + moves + ' 步 / ' + secs + 's，最佳 ' + (-b) + ' 步 🎉');
          });
        }
      } else {
        lock = true;
        const f = first; first = null;
        setTimeout(() => { f.open = c.open = false; lock = false; render(); }, 700);
      }
      render();
    }
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.mem-card');
      if (b) flip(parseInt(b.getAttribute('data-i'), 10));
    });
    XU.$('#memRestart', box).onclick = reset;
    reset();
  }

  /* ============ 猜数字 ============ */
  function guessGame(box) {
    let target = 0, tries = 0, over = false;
    box.innerHTML =
      '<div class="game-head"><div>已猜 <b id="guessTries">0</b> 次</div>' +
      '<button class="btn mini ghost" id="guessRestart">重开</button></div>' +
      '<div class="guess-wrap">' +
        '<div class="guess-num" id="guessHint">我选好了一个 1-100 的数字</div>' +
        '<input type="number" id="guessInput" class="input" min="1" max="100" placeholder="输入你的猜测">' +
        '<button class="btn" id="guessBtn" style="width:100%">猜！</button>' +
      '</div>';
    function reset() {
      target = Math.floor(Math.random() * 100) + 1;
      tries = 0; over = false;
      XU.$('#guessTries', box).textContent = 0;
      XU.$('#guessHint', box).textContent = '我选好了一个 1-100 的数字';
      XU.$('#guessInput', box).value = '';
    }
    function go() {
      if (over) return;
      const inp = XU.$('#guessInput', box);
      const v = parseInt(inp.value, 10);
      if (!v || v < 1 || v > 100) { XU.toast('请输入 1-100 的数字'); return; }
      tries++;
      XU.$('#guessTries', box).textContent = tries;
      const hint = XU.$('#guessHint', box);
      if (v === target) {
        over = true;
        hint.innerHTML = '🎉 猜中了！就是 <b>' + target + '</b>，用了 ' + tries + ' 次';
        updateBest('guess', -tries).then((b) => XU.toast('最佳 ' + (-b) + ' 次 🎯'));
        return;
      }
      hint.textContent = v < target ? '小了，再往大猜 👆' : '大了，再往小猜 👇';
      inp.select();
    }
    XU.$('#guessBtn', box).onclick = go;
    XU.$('#guessInput', box).addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

    XU.$('#guessRestart', box).onclick = reset;
    reset();
  }

  /* ============ 无限冲关（限时答题）============ */
  function towerGame(box) {
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    function makeQ(lv) {
      let text, ans, opts;
      if (lv <= 3) {
        const a = rnd(10, 99), b = rnd(10, 99), c = rnd(10, 99);
        text = '三个数中最大的是？'; ans = Math.max(a, b, c); opts = [a, b, c];
      } else if (lv <= 6) {
        const a = rnd(11, 80), b = rnd(11, 80);
        text = a + ' + ' + b + ' = ?'; ans = a + b;
        opts = [ans, ans + rnd(1, 9), ans - rnd(1, 9), ans + rnd(10, 20)];
      } else if (lv <= 9) {
        const b = rnd(11, 60), a = b + rnd(11, 60);
        text = a + ' \u2212 ' + b + ' = ?'; ans = a - b;
        opts = [ans, ans + rnd(1, 9), ans - rnd(1, 9), ans + rnd(10, 20)];
      } else if (lv <= 14) {
        const a = rnd(3, 9), b = rnd(3, 9);
        text = a + ' \u00d7 ' + b + ' = ?'; ans = a * b;
        opts = [ans, ans + rnd(1, 6), ans - rnd(1, 6), ans + rnd(7, 15)];
      } else {
        const k = rnd(0, 2);
        if (k === 0) { const a = rnd(25, 150), b = rnd(25, 150); text = a + ' + ' + b + ' = ?'; ans = a + b; }
        else if (k === 1) { const b = rnd(25, 120), a = b + rnd(25, 120); text = a + ' \u2212 ' + b + ' = ?'; ans = a - b; }
        else { const a = rnd(6, 13), b = rnd(6, 13); text = a + ' \u00d7 ' + b + ' = ?'; ans = a * b; }
        opts = [ans, ans + rnd(1, 9), ans - rnd(1, 9), ans + rnd(11, 25)];
      }
      opts = Array.from(new Set(opts));
      while (opts.length < 4) opts.push(ans + opts.length * 3 + 1);
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
      return { text: text, ans: ans, opts: opts };
    }
    let lv = 1, completed = 0, timer = null, curQ = null;
    box.innerHTML =
      '<div class="game-head"><div>第 <b id="twLevel">1</b> 关 · 最佳 <b id="twBest">0</b> 关</div>' +
      '<button class="btn mini ghost" id="twRestart">重开</button></div>' +
      '<div class="tower-q" id="twQ">准备…</div>' +
      '<div class="tower-timer"><i id="twBar"></i></div>' +
      '<div class="tower-opts" id="twOpts"></div>' +
      '<p class="sub" style="text-align:center">限时答题 · 答对升级 · 答错/超时结束</p>';
    const q = XU.$('#twQ', box), opts = XU.$('#twOpts', box), bar = XU.$('#twBar', box);
    const lvlEl = XU.$('#twLevel', box), bestEl = XU.$('#twBest', box), restart = XU.$('#twRestart', box);
    getBest().then((b) => { if (b.tower) bestEl.textContent = b.tower; });
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function saveBest() {
      updateBest('tower', completed).then((b) => { bestEl.textContent = b; });
    }
    function gameOver(reason, answer) {
      stop();
      saveBest();
      q.innerHTML = reason + ' 共完成 <b>' + completed + '</b> 关';
      opts.innerHTML = '<button class="tower-opt" id="twAgain" style="grid-column:1/-1;background:var(--primary);color:#fff">🔄 再来一局</button>';
      restart.textContent = '重开';
      XU.toast('冲关结束！完成 ' + completed + ' 关' + (answer != null ? '，正确答案 ' + answer : ''));
    }
    function next() {
      stop();
      curQ = makeQ(lv);
      q.textContent = curQ.text;
      opts.innerHTML = curQ.opts.map((o) => '<button class="tower-opt">' + o + '</button>').join('');
      lvlEl.textContent = lv;
      const left = Math.max(6, 12 - Math.floor(lv / 3));
      bar.style.transition = 'none'; bar.style.width = '100%';
      setTimeout(() => { bar.style.transition = 'width ' + left + 's linear'; bar.style.width = '0%'; }, 40);
      timer = setInterval(() => { if (!timer) return; gameOver('⏰ 时间到！', curQ.ans); }, left * 1000 + 200);
    }
    opts.addEventListener('click', (e) => {
      const b = e.target.closest('.tower-opt');
      if (!b) return;
      if (b.id === 'twAgain') { lv = 1; completed = 0; restart.textContent = '重开'; next(); return; }
      const v = parseInt(b.textContent, 10);
      stop();
      if (v === curQ.ans) { lv++; completed++; next(); }
      else gameOver('❌ 答错啦！', curQ.ans);
    });
    restart.onclick = () => { lv = 1; completed = 0; restart.textContent = '重开'; next(); };
    next();
  }
})();
