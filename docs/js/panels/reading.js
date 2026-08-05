/* panels/reading.js —— 阅读：书籍 / 播客 / 金句 */
(function () {
  const XU = window.XU;

  /* ---------- 书籍 ---------- */
  async function booksTab() {
    const index = await XU.feed('booksIndex').catch(() => []);
    const progress = await XU.Store.all('reading');
    const progMap = {};
    progress.forEach((p) => { progMap[p.bookId] = p; });

    if (!index.length) { const eb = document.createElement('div'); eb.innerHTML = '<div class="card"><div class="empty">书库更新中…</div></div>'; return eb; }

    const CATS = [
      { id: 'all', label: '全部' }, { id: 'fiction', label: '小说' }, { id: 'prose', label: '散文' },
      { id: 'poetry', label: '诗歌' }, { id: 'zawen', label: '杂文' }
    ];
    const box = document.createElement('div');
    box.innerHTML =
      '<div class="card"><h2>📚 书籍</h2><p class="sub">现代文学经典 · 小说/散文/诗歌/杂文 · 全文下载后本机离线阅读 · 自动保存进度</p>' +
      '<div class="tabs" id="bookCats">' + CATS.map((c) => '<button class="tab' + (c.id === 'all' ? ' active' : '') + '" data-cat="' + c.id + '">' + c.label + '</button>').join('') + '</div>' +
      '<input id="bookSearch" class="input" placeholder="🔍 搜索免费书籍（书名 / 作者）" style="width:100%;margin-bottom:10px">' +
      '<div class="list" id="bookList"></div>' +
      '<p class="sub" style="margin-top:8px">💡 想看的书没找到？告诉我书名，我会加进每日更新的书库</p></div>';

    const list = XU.$('#bookList', box);
    let query = '';
    let curCat = 'all';

    async function cachedMap() {
      const m = {};
      try {
        const cache = await caches.open('xu-books');
        const keys = await cache.keys();
        keys.forEach((k) => { const mm = /data\/books\/([^\/]+)\.json/.exec(k.url); if (mm) m[mm[1]] = true; });
      } catch (e) {}
      return m;
    }

    async function render() {
      const cached = await cachedMap();
      const q = query.trim().toLowerCase();
      const items = index.filter((b) =>
        (curCat === 'all' || (b.cat || '') === curCat) &&
        (!q || (b.title + ' ' + (b.author || '') + ' ' + (b.intro || '')).toLowerCase().indexOf(q) >= 0));
      list.innerHTML = items.length ? items.map((b) => {
        const p = progMap[b.id];
        const last = p ? '读到：' + (p.chapterTitle || '') : '未开始';
        return '<div class="row-item" style="cursor:pointer" data-book="' + XU.esc(b.id) + '">' +
          '<div style="width:40px;height:52px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex:0 0 auto">' + XU.esc((b.title || '书').slice(0, 1)) + '</div>' +
          '<div class="grow"><div class="title">' + XU.esc(b.title) + '</div>' +
          '<div class="desc">' + XU.esc(b.author || '') + ' · ' + last + (cached[b.id] ? ' · 已保存本机' : '') + '</div></div>' +
          '<span class="chip">' + XU.icon('bookopen') + '</span></div>';
      }).join('') : '<div class="empty">没找到相关书籍，换个关键词试试</div>';
    }

    XU.$('#bookSearch', box).addEventListener('input', (e) => { query = e.target.value; render(); });
    XU.$('#bookCats', box).addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      curCat = b.getAttribute('data-cat');
      XU.$$('button', XU.$('#bookCats', box)).forEach((x) => x.classList.toggle('active', x === b));
      render();
    });
    box.addEventListener('click', (e) => {
      const item = e.target.closest('[data-book]');
      if (item) {
        const b = index.find((x) => x.id === item.getAttribute('data-book'));
        if (b) openBook(b);
      }
    });
    await render();
    return box;
  }

  async function loadBook(id) {
    const path = 'data/books/' + id + '.json';
    try {
      const cache = await caches.open('xu-books');
      const hit = await cache.match(path);
      if (hit) return { book: await hit.json(), cached: true };
    } catch (e) {}
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    try {
      const cache = await caches.open('xu-books');
      await cache.put(path, res.clone());
    } catch (e) {}
    return { book: await res.json(), cached: false };
  }

  function openBook(b) {
    let close = null;
    close = XU.modal(
      '<h3>📖 ' + XU.esc(b.title) + '</h3><p class="sub">' + XU.esc(b.author || '') + '</p><div id="readerBody"></div>',
      { sticky: true, onMount: async () => {
        const rb = XU.$('#readerBody', close);
        rb.innerHTML = '<div class="empty">📥 正在下载《' + XU.esc(b.title) + '》全文，请稍候…</div>';
        let book = null;
        try { book = await loadBook(b.id); } catch (e) { book = null; }
        if (!book) {
          rb.innerHTML = '<div class="empty">全文还在自动下载中，通常当天就会备好，请稍后再试<br><button class="btn" id="rdRetry" style="margin-top:12px">重新尝试</button></div>';
          XU.$('#rdRetry', close).onclick = () => { close(); openBook(b); };
          return;
        }
        const chapters = book.book.chapters || [];
        const cached = book.cached;
        if (!chapters.length) { rb.innerHTML = '<div class="empty">本书暂无可读内容</div>'; return; }
        let chapterIdx = 0;
        XU.Store.set('reading', { id: b.id, bookId: b.id, chapter: 0, chapterTitle: chapters[0].title, date: XU.today() });
        rb.addEventListener('click', (e) => {
          const p = e.target.closest('[data-para]');
          const nav = e.target.closest('[data-cnav]');
          if (p) { const i = parseInt(p.getAttribute('data-para'), 10); XU.TTS.speak(chapters[chapterIdx].paras[i] || '', 'zh', 1); }
          if (nav) {
            const d = parseInt(nav.getAttribute('data-cnav'), 10);
            const nx = chapterIdx + d;
            if (nx < 0 || nx >= chapters.length) { XU.toast(d < 0 ? '已是第一章' : '已是最后一章'); return; }
            chapterIdx = nx;
            XU.Store.set('reading', { id: b.id, bookId: b.id, chapter: nx, chapterTitle: chapters[nx].title, date: XU.today() });
            renderChapter();
          }
        });
        function renderChapter() {
          const ch = chapters[chapterIdx] || { title: '', paras: [] };
          let html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
            '<button class="btn ghost mini" data-cnav="-1">← 上一章</button>' +
            '<div class="grow" style="text-align:center;font-weight:700">' + XU.esc(ch.title || '') + '</div>' +
            '<button class="btn ghost mini" data-cnav="1">下一章 →</button></div>' +
            '<div style="display:flex;gap:8px;margin-bottom:12px">' +
            '<button class="btn" id="rdAll" style="flex:1">' + XU.icon('sound') + ' 朗读本章</button>' +
            '<button class="btn ghost" id="rdStop" style="flex:1">停止</button></div>' +
            '<div class="reader">' + (ch.paras || []).map((p, i) => '<p data-para="' + i + '">' + XU.esc(p) + '</p>').join('') + '</div>' +
            (cached ? '<p class="sub" style="text-align:center;margin-top:12px">📦 已保存到本机，可离线阅读</p>' : '');
          rb.innerHTML = html;
          XU.$('#rdAll', rb).onclick = () => XU.TTS.speak((ch.paras || []).join(' '), 'zh', 1);
          XU.$('#rdStop', rb).onclick = () => XU.TTS.stop();
        }
        renderChapter();
      } }
    );
  }

  /* ---------- 播客 ---------- */
  async function podcastsTab() {
    const data = await XU.feed('podcasts').catch(() => ({}));
    const eps = (data.episodes || []).filter((e) => e && e.title);
    const CATS = ['提升', '经济', '减压'];
    if (!eps.length) { const eb = document.createElement('div'); eb.innerHTML = '<div class="card"><div class="empty">播客更新中…</div></div>'; return eb; }

    const box = document.createElement('div');
    box.innerHTML = '<div class="card"><h2>🎧 播客</h2><p class="sub">点击即可播放，无需跳转 · 按类别浏览</p>' +
      '<div class="tabs" id="podTabs">' + CATS.map((c) => '<button class="tab' + (c === '提升' ? ' active' : '') + '" data-cat="' + c + '">' + c + '</button>').join('') + '</div>' +
      '<div class="list" id="podList"></div></div>';

    const list = XU.$('#podList', box);
    function visibleEps(cat) { return eps.filter((e) => (e.category || '提升') === cat); }
    function renderList(cat) {
      const items = visibleEps(cat);
      list.innerHTML = items.map((e, i) =>
        '<div class="row-item">' +
          '<div class="grow"><div class="title">' + XU.esc(e.title) + '</div>' +
          '<div class="desc">' + XU.esc(e.desc || '') + (e.duration ? ' · ' + XU.esc(e.duration) : '') + '</div></div>' +
          '<button class="speak-btn" data-play="' + i + '">' + XU.icon('play') + '</button></div>'
      ).join('') || '<div class="empty">该分类暂无内容</div>';
    }
    XU.$('#podTabs', box).addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      XU.$$('.tab', XU.$('#podTabs', box)).forEach((t) => t.classList.toggle('active', t === b));
      renderList(b.getAttribute('data-cat'));
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-play]');
      if (!b) return;
      const cat = XU.$('.tab.active', XU.$('#podTabs', box)).getAttribute('data-cat');
      const item = visibleEps(cat)[parseInt(b.getAttribute('data-play'), 10)];
      if (item) playPodcast(item);
    });
    renderList('提升');
    return box;
  }

  function playPodcast(item) {
    let html = '<h3>🎧 ' + XU.esc(item.title) + '</h3><p class="sub">' + XU.esc(item.desc || '') + '</p>';
    if (item.audio) {
      html += '<audio controls style="width:100%" src="' + XU.esc(item.audio) + '"></audio>';
      html += '<p class="sub" style="margin-top:8px">没有网络时，可用「文字朗读」替代播放</p>';
    } else {
      html += '<div class="empty">该期暂未收录音频</div>';
    }
    if (item.transcript) {
      html += '<button class="btn ghost" id="podTts" style="width:100%;margin-top:10px">' + XU.icon('sound') + ' 文字朗读本期</button>';
    }
    XU.modal(html, { onMount: (mask) => {
      const tts = XU.$('#podTts', mask);
      if (tts) tts.onclick = () => XU.TTS.speak(item.transcript, 'zh', 1);
    } });
  }

  /* ---------- 金句 ---------- */
  async function quotesTab() {
    const quotes = await XU.feed('quotes').catch(() => []);
    if (!quotes.length) { const qb = document.createElement('div'); qb.innerHTML = '<div class="card"><div class="empty">金句更新中…</div></div>'; return qb; }
    const box = document.createElement('div');
    box.innerHTML = '<div class="card"><h2>✨ 金句</h2><p class="sub">每日更新 · 点击可复制、可朗读</p><div class="list">' +
      quotes.map((q, i) =>
        '<div class="row-item" style="cursor:pointer" data-q="' + i + '">' +
        '<div class="grow"><div style="font-size:14.5px">「' + XU.esc(q.text || '') + '」</div>' +
        (q.author ? '<div class="desc" style="margin-top:2px">—— ' + XU.esc(q.author) + '</div>' : '') + '</div>' +
        '<button class="speak-btn" data-qs="' + i + '">' + XU.icon('sound') + '</button></div>'
      ).join('') + '</div></div>';
    box.addEventListener('click', (e) => {
      const s = e.target.closest('[data-qs]');
      const q = e.target.closest('[data-q]');
      if (s) {
        const item = quotes[parseInt(s.getAttribute('data-qs'), 10)];
        XU.TTS.speak(item.text + (item.author ? '，' + item.author : ''), 'zh', 1);
      } else if (q) {
        const item = quotes[parseInt(q.getAttribute('data-q'), 10)];
        XU.copy(item.text + (item.author ? ' ——' + item.author : ''), '金句已复制 ✨');
      }
    });
    return box;
  }

  /* ---------- 面板 ---------- */
  XU.regPanel('reading', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const saved = await XU.Store.kvGet('readingTab');
    let current = saved || 'books';
    let bookIndex = [];

    el.innerHTML =
      '<div class="tabs" id="rdTabs">' +
        '<button class="tab' + (current === 'books' ? ' active' : '') + '" data-tab="books">书籍</button>' +
        '<button class="tab' + (current === 'podcasts' ? ' active' : '') + '" data-tab="podcasts">播客</button>' +
        '<button class="tab' + (current === 'quotes' ? ' active' : '') + '" data-tab="quotes">金句</button>' +
      '</div><div id="rdBody"></div>';

    const body = XU.$('#rdBody', el);
    const tabs = XU.$('#rdTabs', el);

    async function render() {
      body.innerHTML = '<div class="empty">加载中…</div>';
      if (current === 'books') {
        body.innerHTML = '';
        body.appendChild(await booksTab());
      } else if (current === 'podcasts') {
        body.innerHTML = ''; body.appendChild(await podcastsTab());
      } else {
        body.innerHTML = ''; body.appendChild(await quotesTab());
      }
    }

    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      current = b.getAttribute('data-tab');
      XU.Store.kvSet('readingTab', current);
      XU.$$('.tab', tabs).forEach((t) => t.classList.toggle('active', t === b));
      render();
    });
    await render();
  });
})();
