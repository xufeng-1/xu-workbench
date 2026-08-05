/* panels/pomodoro.js —— 番茄钟：25 分钟专注 + 5 分钟休息 + 今日专注统计 */
(function () {
  const XU = window.XU;

  const FOCUS = 25 * 60, BREAK = 5 * 60;
  const STORE_KEY = 'pomodoro';

  function beep(times) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      for (let i = 0; i < times; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = i % 2 ? 880 : 660;
        const t = ctx.currentTime + i * 0.35;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.start(t); o.stop(t + 0.32);
      }
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, times * 400);
    } catch (e) {}
  }
  function buzz() { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }

  async function getStats() {
    const rec = await XU.Store.kvGet(STORE_KEY);
    return rec && rec.dates ? rec : { dates: {} };
  }
  async function addPomodoro() {
    const data = await getStats();
    const t = XU.today();
    data.dates[t] = (data.dates[t] || 0) + 1;
    await XU.Store.kvSet(STORE_KEY, data);
    return data;
  }

  XU.regPanel('pomodoro', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const stats = await getStats();
    const today = XU.today();
    const todayCount = stats.dates[today] || 0;

    el.innerHTML =
      '<div class="card">' +
        '<h2>🍅 番茄钟</h2>' +
        '<p class="sub">25 分钟专注一件事，完成后休息 5 分钟</p>' +
        '<div class="seg" id="pomoMode">' +
          '<button data-mode="focus" class="on">专注 25 分</button>' +
          '<button data-mode="break">休息 5 分</button>' +
        '</div>' +
        '<div class="timer-ring" id="pomoRing" style="background:conic-gradient(var(--primary) 0%,var(--primary-soft) 0)"><div class="timer-num" id="pomoNum">25:00</div></div>' +
        '<div class="pomo-status" id="pomoStatus">准备开始专注</div>' +
        '<div style="display:flex;gap:10px;justify-content:center">' +
          '<button class="btn" id="pomoStart">▶ 开始</button>' +
          '<button class="btn ghost" id="pomoPause">⏸ 暂停</button>' +
          '<button class="btn ghost" id="pomoReset">↺ 重置</button>' +
        '</div>' +
        '<p class="sub" style="text-align:center;margin-top:10px">完成一个番茄，自动计入今日专注</p>' +
      '</div>' +
      '<div class="card">' +
        '<h2>📊 专注统计</h2>' +
        '<div class="grid2">' +
          '<div class="stat-card"><div class="ico">🍅</div><div class="num" id="pomoToday">' + todayCount + '</div><div class="lab">今日番茄</div></div>' +
          '<div class="stat-card"><div class="ico">⏱️</div><div class="num" id="pomoMins">' + todayCount * 25 + '</div><div class="lab">今日专注(分)</div></div>' +
        '</div>' +
        '<div class="pomo-week" id="pomoWeek"></div>' +
      '</div>';

    let mode = 'focus';
    let total = FOCUS;
    let left = total;
    let running = false;
    let timer = null;
    const numEl = XU.$('#pomoNum', el);
    const ringEl = XU.$('#pomoRing', el);
    const statusEl = XU.$('#pomoStatus', el);

    function fmt(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
    function draw() {
      numEl.textContent = fmt(left);
      const pct = total ? Math.round(((total - left) / total) * 100) : 0;
      ringEl.style.background = 'conic-gradient(var(--primary) ' + pct + '%, var(--primary-soft) ' + pct + '%)';
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    function setMode(m) {
      mode = m;
      total = m === 'focus' ? FOCUS : BREAK;
      left = total;
      running = false; stop();
      XU.$$('#pomoMode button', el).forEach((b) => b.classList.toggle('on', b.getAttribute('data-mode') === m));
      statusEl.textContent = m === 'focus' ? '准备开始专注' : '准备休息，放松一下';
      draw();
    }

    function finish() {
      stop(); running = false;
      if (mode === 'focus') {
        addPomodoro().then((d) => {
          XU.$('#pomoToday', el).textContent = d.dates[XU.today()] || 0;
          XU.$('#pomoMins', el).textContent = (d.dates[XU.today()] || 0) * 25;
          renderWeek();
        });
        statusEl.textContent = '🎉 专注完成！休息 5 分钟，奖励一下自己';
        XU.toast('专注完成，+1 个番茄 🍅');
        beep(3); buzz();
        setMode('break');
      } else {
        statusEl.textContent = '☕ 休息结束，准备开始下一个番茄吧';
        XU.toast('休息结束 ☕');
        beep(2);
        setMode('focus');
      }
    }

    function start() {
      if (running) return;
      running = true;
      stop();
      timer = setInterval(() => {
        left--;
        if (left <= 0) { left = 0; draw(); finish(); return; }
        draw();
      }, 1000);
    }

    XU.$('#pomoMode', el).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) setMode(b.getAttribute('data-mode'));
    });
    XU.$('#pomoStart', el).onclick = () => { start(); statusEl.textContent = mode === 'focus' ? '专注中…加油！' : '休息中…'; };
    XU.$('#pomoPause', el).onclick = () => { if (running) { running = false; stop(); statusEl.textContent = '已暂停'; } };
    XU.$('#pomoReset', el).onclick = () => { running = false; stop(); left = total; draw(); statusEl.textContent = mode === 'focus' ? '已重置，准备开始' : '已重置，准备休息'; };

    function renderWeek() {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({ key: key, n: stats.dates[key] || 0 });
      }
      const max = Math.max(1, Math.max.apply(null, days.map((d) => d.n)));
      XU.$('#pomoWeek', el).innerHTML =
        '<p class="sub">最近 7 天</p><div class="pomo-week-bars">' +
        days.map((d) =>
          '<div class="pomo-day"><div class="pomo-bar-wrap"><div class="pomo-bar" style="height:' + Math.max(4, Math.round((d.n / max) * 56)) + 'px"></div></div>' +
          '<div class="pomo-cnt">' + (d.n || '') + '</div><div class="pomo-wd">' + (d.key === today ? '今' : '日一二三四五六'[new Date(d.key).getDay()]) + '</div></div>'
        ).join('') + '</div>';
    }
    function renderWeekFresh() {
      // re-read stats so week chart reflects newly saved data
      getStats().then((s) => { Object.assign(stats.dates, s.dates); renderWeek(); });
    }
    renderWeekFresh();
    draw();
  });
})();
