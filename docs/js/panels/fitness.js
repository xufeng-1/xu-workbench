/* panels/fitness.js —— 健身：身高体重 / 计时器 / 训练视频 */
(function () {
  const XU = window.XU;

  const PARTS = [
    { id: 'chest', label: '胸' },
    { id: 'back', label: '背' },
    { id: 'legs', label: '腿' },
    { id: 'shoulders', label: '肩' },
    { id: 'abs', label: '腹' },
    { id: 'full', label: '全身' }
  ];

  async function records() {
    const all = await XU.Store.all('fitness');
    return all.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  function weightChart(recs) {
    const r = recs.slice(0, 14).reverse().filter((x) => x.weight);
    if (r.length < 2) return '';
    const w = 300, h = 110, pad = 8;
    const min = Math.min.apply(null, r.map((x) => x.weight)) - 1;
    const max = Math.max.apply(null, r.map((x) => x.weight)) + 1;
    const px = (i) => pad + (i * (w - pad * 2)) / (r.length - 1);
    const py = (v) => h - pad - ((v - min) * (h - pad * 2)) / (max - min);
    let path = r.map((x, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(x.weight).toFixed(1)).join(' ');
    let dots = r.map((x, i) => '<circle cx="' + px(i).toFixed(1) + '" cy="' + py(x.weight).toFixed(1) + '" r="3" fill="#7C6BD4"><title>' + x.date + ' ' + x.weight + 'kg</title></circle>').join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto">' +
      '<path d="' + path + '" fill="none" stroke="#9A8BDF" stroke-width="2.5" stroke-linecap="round"/>' + dots + '</svg>';
  }

  function bodyRecordCard(recs, rerender) {
    const latest = recs[0];
    const prev = recs[1];
    const diffW = latest && prev && latest.weight && prev.weight ? latest.weight - prev.weight : null;
    const diffH = latest && prev && latest.height && prev.height ? latest.height - prev.height : null;
    const delta = (v) => {
      if (v == null) return '<span class="chip">—</span>';
      if (Math.abs(v) < 0.01) return '<span class="chip">持平</span>';
      return v > 0 ? '<span class="chip" style="background:#FBE9E9;color:var(--danger)">▲ +' + v.toFixed(1) + '</span>' : '<span class="chip" style="background:#E7F6EC;color:var(--ok)">▼ ' + v.toFixed(1) + '</span>';
    };
    return '<div class="card">' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<h2>📏 身高体重</h2>' +
        '<button class="btn mini" id="addFitness">+ 记录</button>' +
      '</div>' +
      '<p class="sub">每日记录，自动对比变化（最近 ' + (recs[0] ? recs[0].date : '—') + '）</p>' +
      (latest
        ? '<div class="grid3">' +
            '<div class="stat-card"><div class="num">' + (latest.height || '—') + '</div><div class="lab">身高 cm ' + delta(diffH) + '</div></div>' +
            '<div class="stat-card"><div class="num">' + (latest.weight || '—') + '</div><div class="lab">体重 kg</div></div>' +
            '<div class="stat-card"><div class="num" style="font-size:14px">' + delta(diffW) + '</div><div class="lab">较上次</div></div>' +
          '</div>' +
          (recs.length > 1 ? weightChart(recs) + '<div class="updated">近14次体重趋势</div>' : '')
        : '<div class="empty">还没有记录，点「+ 记录」开始</div>') +
      '<div style="margin-top:8px"><details><summary style="color:var(--muted);font-size:12.5px;cursor:pointer">查看历史记录</summary>' +
      '<table class="tbl"><tr><th>日期</th><th>身高</th><th>体重</th></tr>' +
      recs.map((r) => '<tr><td>' + r.date + '</td><td>' + (r.height || '—') + ' cm</td><td>' + (r.weight || '—') + ' kg</td></tr>').join('') +
      '</table></details></div></div>';

    function addModal() {
      XU.modal(
        '<h3>记录身高体重</h3>' +
        '<label class="lbl">日期</label><input type="date" id="fDate" value="' + XU.today() + '">' +
        '<label class="lbl">身高（cm）</label><input type="number" id="fH" placeholder="如 175" step="0.5">' +
        '<label class="lbl">体重（kg）</label><input type="number" id="fW" placeholder="如 65.5" step="0.1">' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
        { onMount: (mask, close) => {
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const date = XU.$('#fDate', mask).value || XU.today();
            const h = parseFloat(XU.$('#fH', mask).value);
            const w = parseFloat(XU.$('#fW', mask).value);
            if (!h && !w) { XU.toast('至少填一项'); return; }
            const old = await XU.Store.get('fitness', date);
            await XU.Store.set('fitness', { id: date, date, height: h || (old && old.height), weight: w || (old && old.weight) });
            close(); rerender(); XU.toast('已记录 ✔');
          };
        } }
      );
    }
    // 绑定
    setTimeout(() => { const b = XU.$('#addFitness', document); if (b) b.onclick = addModal; }, 0);
  }

  function timerCard() {
    let seconds = 0, target = 0, timer = null, running = false;
    const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<h2>⏱️ 健身计时器</h2><p class="sub">定时训练，完成后自动计入今日运动打卡</p>' +
      '<div class="seg" id="timerPresets">' +
        '<button data-min="15">15分</button><button data-min="30">30分</button>' +
        '<button data-min="45">45分</button><button data-min="60">60分</button><button data-min="0">自由</button>' +
      '</div>' +
      '<div class="timer-ring" id="ring"><div class="timer-num" id="timerNum">00:00</div></div>' +
      '<div style="display:flex;gap:10px;justify-content:center">' +
        '<button class="btn" id="tStart">▶ 开始</button>' +
        '<button class="btn ghost" id="tPause">⏸ 暂停</button>' +
        '<button class="btn ghost" id="tReset">↺ 重置</button>' +
      '</div>' +
      '<p style="text-align:center;color:var(--muted);font-size:12.5px;margin:10px 0 0" id="timerHint">选择时长后开始</p>';

    const numEl = XU.$('#timerNum', card);
    const ring = XU.$('#ring', card);
    const hint = XU.$('#timerHint', card);

    function draw() {
      numEl.textContent = fmt(seconds);
      const pct = target ? Math.min(100, (seconds / target) * 100) : 0;
      ring.style.background = 'conic-gradient(var(--primary) ' + pct + '%, var(--primary-soft) ' + pct + '%)';
    }
    function stopTicker() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      if (running) return;
      running = true;
      stopTicker();
      timer = setInterval(() => {
        seconds++;
        if (target && seconds >= target) {
          seconds = target;
          draw();
          finish();
        } else draw();
      }, 1000);
    }
    function pause() { running = false; stopTicker(); }
    function reset() { running = false; stopTicker(); seconds = 0; draw(); }
    function finish() {
      pause();
      const mins = Math.max(1, Math.round(seconds / 60));
      XU.Store.get('workouts', XU.today()).then((r) =>
        XU.Store.set('workouts', { id: XU.today(), date: XU.today(), minutes: (r ? r.minutes : 0) + mins })
      );
      hint.textContent = '🎉 训练完成！已自动计入运动打卡 ' + mins + ' 分钟';
      XU.toast('训练完成，打卡 +' + mins + ' 分钟 🎉');
      navigator.vibrate && navigator.vibrate([200, 100, 200]);
    }

    XU.$('#timerPresets', card).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      target = parseInt(b.getAttribute('data-min'), 10) * 60;
      reset();
      hint.textContent = target ? '目标 ' + b.textContent + '，点「开始」' : '自由计时，点「开始」';
    });
    XU.$('#tStart', card).onclick = () => { start(); hint.textContent = '训练中…'; };
    XU.$('#tPause', card).onclick = () => { pause(); hint.textContent = '已暂停'; };
    XU.$('#tReset', card).onclick = () => { reset(); hint.textContent = target ? '已重置' : '已重置'; };
    return card;
  }

  async function videoCard(partId) {
    const data = await XU.feed('fitnessVideos').catch(() => ({}));
    const videos = ((data.parts || {})[partId] || []).filter((v) => v && v.title);
    if (!videos.length) return '<div class="empty">今日该部位视频更新中，稍后再来看看～</div>';
    return '<div class="list">' + videos.map((v) => XU.videoCard(v)).join('') + '</div>';
  }

  XU.regPanel('fitness', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);
    const recs = await records();
    el.innerHTML = '<div id="fitnessBody"></div>' +
      '<div class="card"><h2>🎯 训练视频推荐</h2><p class="sub">按部位分类 · 每日抖音热门更新</p>' +
      '<div class="tabs" id="partTabs">' + PARTS.map((p) => '<button class="tab" data-part="' + p.id + '">' + p.label + '</button>').join('') + '</div>' +
      '<div id="partVideos"><div class="empty">加载中…</div></div></div>';

    const body = XU.$('#fitnessBody', el);
    function renderAll() {
      body.innerHTML = bodyRecordCard(recs, renderAll) + '';
      body.appendChild(timerCard());
    }
    renderAll();

    const tabs = XU.$('#partTabs', el);
    const videoBox = XU.$('#partVideos', el);
    let currentPart = PARTS[0].id;

    async function loadPart(partId) {
      currentPart = partId;
      XU.$$('.tab', tabs).forEach((t) => t.classList.toggle('active', t.getAttribute('data-part') === partId));
      videoBox.innerHTML = '<div class="empty">加载中…</div>';
      videoBox.innerHTML = await videoCard(partId);
    }
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (b) loadPart(b.getAttribute('data-part'));
    });
    loadPart(currentPart);
  });
})();
