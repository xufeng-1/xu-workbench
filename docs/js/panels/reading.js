/* panels/reading.js —— 阅读：书籍 / 播客 / 金句 */
(function () {
  const XU = window.XU;

  /* ---------- 书籍 ---------- */
  async function booksTab() {
    const index = await XU.feed('booksIndex').catch(() => []);
    const progress = await XU.Store.all('reading');
    const progMap = {};
    progress.forEach((p) => { progMap[p.bookId] = p; });

    if (!index.length) return '<div class="card"><div class="empty">书库更新中…</div></div>';

    let html = '<div class="card"><h2>📚 书籍</h2><p class="sub">提升阅历 · 公版经典全文 · 可朗读，自动保存阅读进度</p><div class="list">';
    index.forEach((b, i) => {
      const p = progMap[b.id];
      const last = p ? '读到：' + (p.chapterTitle || '') : '未开始';
      html += '<div class="row-item" style="cursor:pointer" data-book="' + i + '">' +
        '<div style="width:40px;height:52px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex:0 0 auto">' + (b.title || '书').slice(0, 1) + '</div>' +
        '<div class="grow"><div class="title">' + XU.esc(b.title) + '</div>' +
        '<div class="desc">' + XU.esc(b.author || '') + ' · ' + last + '</div></div>' +
        '<span class="chip">' + XU.icon('bookopen') + '</span></div>';
    });
    html += '</div></div>';
    return html;
  }

  async function openBook(b) {
    let book = null;
    try {
      const res = await fetch('data/books/' + b.id + '.json', { cache: 'no-store' });
      if (res.ok) book = await res.json();
    } catch (e) { /* 离线时由 SW 兜底 */ }
    if (!book) { XU.toast('书籍全文下载中，请稍后再试'); return; }

    const chapters = book.chapters || [];
    let chapterIdx = 0;
    let close = null;

    function renderChapter() {
      const ch = chapters[chapterIdx] || { title: '', paras: [] };
      let html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<button class="btn ghost mini" data-cnav="-1">← 上一章</button>' +
        '<div class="grow" style="text-align:center;font-weight:700">' + XU.esc(ch.title || '') + '</div>' +
        '<button class="btn ghost mini" data-cnav="1">下一章 →</button></div>' +
        '<div style="display:flex;gap:8px;margin-bottom:12px">' +
        '<button class="btn" id="rdAll" style="flex:1">' + XU.icon('sound') + ' 朗读本章</button>' +
        '<button class="btn ghost" id="rdStop" style="flex:1">停止</button></div>' +
        '<div class="reader">' + (ch.paras || []).map((p, i) =>
          '<p data-para="' + i + '">' + XU.esc(p) + '</p>').join('') + '</div>';
      XU.$('#readerBody', close).innerHTML = html;

      XU.$('#rdAll', close).onclick = () => XU.TTS.speak((ch.paras || []).join(' '), 'zh', 1);
      XU.$('#rdStop', close).onclick = () => XU.TTS.stop();
      XU.$('#readerBody', close).addEventListener('click', (e) => {
        const p = e.target.closest('[data-para]');
        const nav = e.target.closest('[data-cnav]');
        if (p) {
          const i = parseInt(p.getAttribute('data-para'), 10);
          XU.TTS.speak(ch.paras[i] || '', 'zh', 1);
        }
        if (nav) {
          const d = parseInt(nav.getAttribute('data-cnav'), 10);
          const nx = chapterIdx + d;
          if (nx < 0 || nx >= chapters.length) { XU.toast(d < 0 ? '已是第一章' : '已是最后一章'); return; }
          chapterIdx = nx;
          XU.Store.set('reading', { id: b.id, bookId: b.id, chapter: nx, chapterTitle: chapters[nx].title, date: XU.today() });
          renderChapter();
        }
      });
    }

    close = XU.modal(
      '<h3>📖 ' + XU.esc(book.title) + '</h3><p class="sub">' + XU.esc(book.author || '') + '</p><div id="readerBody"></div>',
      { sticky: true, onMount: () => {
        XU.Store.set('reading', { id: b.id, bookId: b.id, chapter: 0, chapterTitle: chapters[0] && chapters[0].title, date: XU.today() });
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
        bookIndex = await XU.feed('booksIndex').catch(() => []);
        body.innerHTML = await booksTab();
        body.addEventListener('click', (e) => {
          const item = e.target.closest('[data-book]');
          if (item && bookIndex[parseInt(item.getAttribute('data-book'), 10)]) openBook(bookIndex[parseInt(item.getAttribute('data-book'), 10)]);
        });
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
