/* panels/english.js —— 英语：单词打卡 / 场景口语 / 新概念 */
(function () {
  const XU = window.XU;

  const BANKS = [
    { id: 'cet6', label: '六级', file: 'wordsCet6' },
    { id: 'ielts', label: '雅思', file: 'wordsIelts' },
    { id: 'job', label: '求职', file: 'wordsJob' }
  ];
  const DAILY = 10;

  function dayIdx() {
    const epoch = new Date(2026, 0, 1).getTime();
    return Math.floor((new Date(XU.today()).getTime() - epoch) / 86400000);
  }

  async function learnedMap() {
    const kv = await XU.Store.kvGet('wordLearned');
    return kv || {};
  }
  async function markLearned(bank, word) {
    const map = await learnedMap();
    map[bank] = map[bank] || {};
    map[bank][word] = XU.today();
    await XU.Store.kvSet('wordLearned', map);
  }

  function todayWords(bank) {
    const n = bank.length;
    if (!n) return [];
    const start = (dayIdx() * DAILY) % n;
    const out = [];
    for (let i = 0; i < DAILY && out.length < Math.min(DAILY, n); i++) {
      out.push(bank[(start + i) % n]);
    }
    return out;
  }

  /* ---------- 单词打卡 ---------- */
  async function wordTab(bankId) {
    const meta = BANKS.find((b) => b.id === bankId);
    const bank = await XU.feed(meta.file).catch(() => []);
    const words = todayWords(bank);
    const learned = await learnedMap();
    const learnedSet = new Set(Object.keys(learned[bankId] || {}));
    const todayLearned = words.filter((w) => learnedSet.has(w.w)).length;

    const box = document.createElement('div');
    box.innerHTML =
      '<div class="card">' +
        '<h2>📚 单词打卡 · ' + meta.label + '</h2>' +
        '<p class="sub">每日自动更新 10 个新单词 · 真实语音朗读</p>' +
        '<div class="progress" style="margin-bottom:8px"><i style="width:' + Math.round((todayLearned / DAILY) * 100) + '%"></i></div>' +
        '<div class="sub">今日已学 <b style="color:var(--primary)">' + todayLearned + '/' + words.length + '</b> · 累计已学 <b style="color:var(--primary)">' + learnedSet.size + '</b></div>' +
        (words.length ? '' : '<div class="empty">词库更新中…</div>') +
      '</div>';

    if (!words.length) return box.innerHTML;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="seg" id="wordNav"></div>' +
      '<div id="wordView" style="min-height:170px"></div>' +
      '<div style="display:flex;gap:10px;margin-top:12px">' +
        '<button class="btn ghost" id="wPrev" style="flex:1">← 上一个</button>' +
        '<button class="btn" id="wMark" style="flex:2">标记已学</button>' +
        '<button class="btn ghost" id="wNext" style="flex:1">下一个 →</button>' +
      '</div>';

    let idx = 0;
    const seg = XU.$('#wordNav', card);
    const view = XU.$('#wordView', card);

    function renderSeg() {
      seg.innerHTML = words.map((w, i) => '<button class="' + (i === idx ? 'on' : '') + '" data-i="' + i + '">' + (i + 1) + '</button>').join('');
    }
    function renderWord() {
      const w = words[idx];
      const done = learnedSet.has(w.w);
      view.innerHTML =
        '<div style="text-align:center;padding:6px 0 0">' +
          '<div style="font-size:30px;font-weight:800;color:var(--text)">' + XU.esc(w.w) + '</div>' +
          '<div style="color:var(--primary);margin-top:2px">' + XU.esc(w.p || '') + '</div>' +
          '<div style="margin-top:10px;font-size:15px">' + XU.esc(w.m || '') + '</div>' +
          (w.ex ? '<div style="margin-top:12px;background:var(--card-tint);border-radius:12px;padding:10px;font-size:13.5px;color:var(--muted)">' + XU.esc(w.ex) + '</div>' : '') +
          '<div style="margin-top:14px"><button class="speak-btn" id="wSpeak">' + XU.icon('sound') + ' 朗读</button></div>' +
          (done ? '<div class="chip" style="margin-top:10px">✔ 已学习</div>' : '') +
        '</div>';
      XU.$('#wSpeak', view).onclick = () => {
        XU.TTS.speak(w.w + '. ' + (w.ex || ''), 'en', 0.9);
      };
      XU.$('#wMark', card).disabled = done;
      XU.$('#wMark', card).textContent = done ? '已标记 ✔' : '标记已学';
    }

    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) { idx = parseInt(b.getAttribute('data-i'), 10); renderSeg(); renderWord(); }
    });
    XU.$('#wPrev', card).onclick = () => { idx = (idx - 1 + words.length) % words.length; renderSeg(); renderWord(); };
    XU.$('#wNext', card).onclick = () => { idx = (idx + 1) % words.length; renderSeg(); renderWord(); };
    XU.$('#wMark', card).onclick = async () => {
      const w = words[idx];
      await markLearned(bankId, w.w);
      learnedSet.add(w.w);
      XU.toast('已学习：' + w.w + ' 🎉');
      renderWord();
      XU.route();
    };
    renderSeg(); renderWord();
    box.appendChild(card);
    return box.innerHTML;
  }

  /* ---------- 场景口语 ---------- */
  async function oralTab() {
    const data = await XU.feed('oral').catch(() => ({}));
    const all = data.scenarios || [];
    // 每周轮换：取本周一组（8个场景为一组）
    let list = all;
    if (all.length > 8) {
      const weekIdx = Math.floor(dayIdx() / 7);
      list = [];
      for (let i = 0; i < 8; i++) list.push(all[(weekIdx * 8 + i) % all.length]);
    }
    if (!list.length) return '<div class="card"><div class="empty">口语场景更新中…</div></div>';

    let html = '<div class="card"><h2>🗣️ 场景口语</h2><p class="sub">8 个真实场景 · 每周更新 · 可逐句跟读</p><div class="list">';
    list.forEach((s, i) => {
      html += '<div class="row-item" style="cursor:pointer" data-oral="' + i + '">' +
        '<div class="grow"><div class="title">' + (i + 1) + '. ' + XU.esc(s.title) + '</div>' +
        '<div class="desc">' + XU.esc(s.scene || '') + '</div></div><span class="chip">跟读</span></div>';
    });
    html += '</div></div>';

    const box = document.createElement('div');
    box.innerHTML = html;
    box.addEventListener('click', (e) => {
      const item = e.target.closest('[data-oral]');
      if (!item) return;
      const s = list[parseInt(item.getAttribute('data-oral'), 10)];
      openOral(s);
    });
    return box.innerHTML;
  }

  function openOral(s) {
    let html = '<h3>🗣️ ' + XU.esc(s.title) + '</h3><p class="sub">' + XU.esc(s.scene || '') + '</p>';
    html += '<button class="btn" id="oralAll" style="width:100%;margin-bottom:10px">' + XU.icon('sound') + ' 播放整段对话</button>';
    html += (s.lines || []).map((l, i) =>
      '<div class="dialogue-line"><span class="who">' + XU.esc(l.spk || 'A') + '</span>' +
      '<div class="grow"><div>' + XU.esc(l.en) + '</div>' +
      '<div class="para-cn">' + XU.esc(l.cn || '') + '</div></div>' +
      '<button class="speak-btn" data-line="' + i + '">' + XU.icon('sound') + '</button></div>'
    ).join('');
    if (s.tips) html += '<p style="background:var(--card-tint);border-radius:12px;padding:10px;margin-top:10px">💡 <b>小贴士</b>：' + XU.esc(s.tips) + '</p>';
    XU.modal(html, { onMount: (mask, close) => {
      const all = XU.$('#oralAll', mask);
      if (all) all.onclick = () => {
        XU.TTS.speak((s.lines || []).map((l) => l.en).join(' '), 'en', 1);
      };
      mask.addEventListener('click', (e) => {
        const b = e.target.closest('[data-line]');
        if (b) {
          const l = s.lines[parseInt(b.getAttribute('data-line'), 10)];
          XU.TTS.speak(l.en, 'en', 0.95);
          b.classList.add('speaking');
          setTimeout(() => b.classList.remove('speaking'), Math.max(1500, l.en.length * 90));
        }
      });
    } });
  }

  /* ---------- 新概念 ---------- */
  async function nceTab() {
    const data = await XU.feed('nce').catch(() => ({}));
    const lessons = data.lessons || [];
    if (!lessons.length) return '<div class="card"><div class="empty">新概念课文更新中…</div></div>';
    // 每周更新：按周轮换，展示本周课文
    const weekIdx = Math.floor(dayIdx() / 7);
    const picked = [lessons[weekIdx % lessons.length]];
    const extra = lessons.filter((l) => l.id !== picked[0].id).slice(0, 2);
    const show = picked.concat(extra);

    const box = document.createElement('div');
    box.innerHTML = '<div class="card"><h2>📖 新概念英语（原创课文）</h2><p class="sub">中英对照 · 可跟读 · 每周更新</p><div class="list">' +
      show.map((l, i) =>
        '<div class="row-item" style="cursor:pointer" data-nce="' + i + '">' +
        '<div class="grow"><div class="title">' + XU.esc(l.title) + '</div><div class="desc">' + (l.words || []).length + ' 个生词 · 点击阅读</div></div>' +
        '<span class="chip">' + XU.icon('bookopen') + '</span></div>'
      ).join('') + '</div></div>';
    box.addEventListener('click', (e) => {
      const item = e.target.closest('[data-nce]');
      if (item) openNce(show[parseInt(item.getAttribute('data-nce'), 10)]);
    });
    return box.innerHTML;
  }

  function openNce(l) {
    let html = '<h3>📖 ' + XU.esc(l.title) + '</h3>';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<button class="btn" id="nceAll" style="flex:1">' + XU.icon('sound') + ' 全文朗读</button>' +
      '<button class="btn ghost" id="nceStop" style="flex:1">停止</button></div>';
    (l.en || []).forEach((p, i) => {
      html += '<p class="reader-p" data-para="' + i + '">' + XU.esc(p) + '</p>';
      html += '<p class="para-cn" data-para="' + i + '">' + XU.esc((l.cn || [])[i] || '') + '</p>';
    });
    if (l.words && l.words.length) {
      html += '<p class="sub" style="margin-top:12px"><b>生词</b></p><div style="display:flex;flex-wrap:wrap;gap:6px">' +
        l.words.map((w) => '<span class="chip" data-wn="' + XU.esc(w.w) + '">' + XU.esc(w.w) + ' ' + XU.esc(w.m || '') + '</span>').join('') + '</div>';
    }
    XU.modal(html, { onMount: (mask) => {
      const all = XU.$('#nceAll', mask);
      const stop = XU.$('#nceStop', mask);
      if (all) all.onclick = () => XU.TTS.speak(l.en.join(' '), 'en', 0.95);
      if (stop) stop.onclick = () => XU.TTS.stop();
      mask.addEventListener('click', (e) => {
        const p = e.target.closest('[data-para]');
        if (p) {
          const i = parseInt(p.getAttribute('data-para'), 10);
          XU.TTS.speak(l.en[i] || '', 'en', 0.9);
        }
      });
    } });
  }

  /* ---------- 面板 ---------- */
  XU.regPanel('english', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);
    let bankId = 'cet6';
    const saved = await XU.Store.kvGet('englishBank');
    if (saved && BANKS.some((b) => b.id === saved)) bankId = saved;

    el.innerHTML =
      '<div class="tabs" id="enTabs">' +
        '<button class="tab active" data-tab="word">单词打卡</button>' +
        '<button class="tab" data-tab="oral">场景口语</button>' +
        '<button class="tab" data-tab="nce">新概念</button>' +
      '</div><div id="enBody"></div>';

    const body = XU.$('#enBody', el);
    const tabs = XU.$('#enTabs', el);
    let current = 'word';

    async function render() {
      body.innerHTML = '<div class="empty">加载中…</div>';
      if (current === 'word') {
        body.innerHTML = '<div class="tabs" id="bankTabs">' + BANKS.map((b) =>
          '<button class="tab' + (b.id === bankId ? ' active' : '') + '" data-bank="' + b.id + '">' + b.label + '</button>').join('') + '</div>';
        body.insertAdjacentHTML('beforeend', '<div id="bankBody"></div>');
        XU.$('#bankTabs', body).addEventListener('click', async (e) => {
          const b = e.target.closest('[data-bank]');
          if (!b || b.getAttribute('data-bank') === bankId) return;
          bankId = b.getAttribute('data-bank');
          await XU.Store.kvSet('englishBank', bankId);
          XU.$$('.tab', XU.$('#bankTabs', body)).forEach((t) => t.classList.toggle('active', t.getAttribute('data-bank') === bankId));
          XU.$('#bankBody', body).innerHTML = await wordTab(bankId);
        });
        XU.$('#bankBody', body).innerHTML = await wordTab(bankId);
      } else if (current === 'oral') {
        body.innerHTML = await oralTab();
      } else {
        body.innerHTML = await nceTab();
      }
    }

    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      current = b.getAttribute('data-tab');
      XU.$$('.tab', tabs).forEach((t) => t.classList.toggle('active', t === b));
      render();
    });
    await render();
  });
})();
