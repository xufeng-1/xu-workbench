/* app.js —— xu的工作台 核心：导航、路由、数据加载、通用组件 */
(function () {
  const XU = window.XU;

  /* ---------- 图标 ---------- */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.8a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/>',
    wallet: '<rect x="2" y="6" width="20" height="13" rx="2.5"/><path d="M16 12.5h3"/><path d="M2 9h20"/>',
    pot: '<path d="M2 12h20"/><path d="M4 12v6a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-6"/><path d="M12 6V4M7.5 7l-1-2.2M16.5 7l1-2.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    play: '<path d="M7 4.5l11 7.5-11 7.5Z"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    water: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11Z"/>',
    sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5Z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    flame: '<path d="M12 3s5.5 5 5.5 10a5.5 5.5 0 0 1-11 0c0-1.8.9-3.6 2-5 .3 1.2 1 2 2 2.4C10 8 12 5 12 3Z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.8a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    download: '<path d="M12 4v10M8 10l4 4 4-4"/><path d="M4 19h16"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v4M16 3v4"/>',
    chartpie: '<path d="M12 3a9 9 0 1 0 9 9h-9Z"/><path d="M12 3v9h9"/>',
    bookopen: '<path d="M12 6.5C10.5 4.8 8.3 4 5.5 4v14c2.8 0 5 .8 6.5 2.5 1.5-1.7 3.7-2.5 6.5-2.5V4c-2.8 0-5 .8-6.5 2.5Z"/>'
  };
  XU.ICONS = ICONS;
  XU.icon = (name, cls) => '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';

  /* ---------- 面板注册表 ---------- */
  const PANELS = [
    { id: 'home', label: '首页' },
    { id: 'fitness', label: '健身' },
    { id: 'creation', label: '创作' },
    { id: 'english', label: '英语' },
    { id: 'reading', label: '阅读' },
    { id: 'study', label: '数据' },
    { id: 'money', label: '记账' },
    { id: 'recipes', label: '菜谱' }
  ];
  XU.panels = {};
  XU.regPanel = (id, renderer) => { XU.panels[id] = renderer; };

  /* ---------- 数据源 ---------- */
  const FEEDS = {
    home: 'data/home.json',
    fitnessVideos: 'data/fitness/videos.json',
    creation: 'data/creation.json',
    wordsCet6: 'data/words/cet6.json',
    wordsIelts: 'data/words/ielts.json',
    wordsJob: 'data/words/job.json',
    oral: 'data/oral.json',
    nce: 'data/nce.json',
    booksIndex: 'data/books/index.json',
    podcasts: 'data/podcasts.json',
    quotes: 'data/quotes.json',
    study: 'data/study/chapters.json',
    studyFeed: 'data/study/feed.json',
    recipes: 'data/recipes/recipes.json'
  };
  XU.meta = { updated: '', online: true };

  async function loadMeta() {
    try {
      const m = await fetchJSON('data/index.json', true);
      if (m && m.updated) XU.meta.updated = m.updated;
      XU.meta.online = true;
    } catch (e) {
      const c = cacheGet('data/index.json');
      if (c && c.updated) XU.meta.updated = c.updated;
      XU.meta.online = false;
    }
  }

  function cacheGet(path) {
    try { const raw = localStorage.getItem('xucache:' + path); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function cacheSet(path, obj) {
    try { localStorage.setItem('xucache:' + path, JSON.stringify(obj)); } catch (e) { /* 容量超限忽略 */ }
  }
  async function fetchJSON(path, isMeta) {
    const url = isMeta ? path : path + (XU.meta.updated ? '?v=' + encodeURIComponent(XU.meta.updated) : '');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    cacheSet(path, data);
    return data;
  }
  XU.feed = async function (name) {
    const path = FEEDS[name];
    if (!path) throw new Error('unknown feed: ' + name);
    try {
      const d = await fetchJSON(path);
      if (d) return d;
      throw new Error('empty');
    } catch (e) {
      const c = cacheGet(path);
      if (c) return c;
      throw e;
    }
  };

  /* ---------- 工具 ---------- */
  XU.$ = (sel, root) => (root || document).querySelector(sel);
  XU.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  XU.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  XU.today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  XU.now = () => { const d = new Date(); return XU.today() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  XU.money = (n) => '¥' + (Math.round(n * 100) / 100).toFixed(2);
  XU.daysAgo = (dateStr) => Math.floor((new Date(XU.today()).getTime() - new Date(dateStr).getTime()) / 86400000);

  XU.toast = function (msg, ms) {
    const t = XU.$('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(XU._toastTimer);
    XU._toastTimer = setTimeout(() => { t.hidden = true; }, ms || 1800);
  };

  XU.modal = function (html, opts) {
    opts = opts || {};
    const root = XU.$('#modalRoot');
    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = '<div class="modal" role="dialog">' + html + '</div>';
    root.appendChild(mask);
    const close = () => { mask.remove(); };
    mask.addEventListener('click', (e) => { if (e.target === mask && !opts.sticky) close(); });
    if (opts.onMount) opts.onMount(mask, close);
    return close;
  };

  XU.confirm = function (msg, onYes, danger) {
    XU.modal(
      '<h3>确认操作</h3><p style="color:var(--muted)">' + XU.esc(msg) + '</p>' +
      '<div class="actions"><button class="btn ghost" data-x="no">取消</button>' +
      '<button class="btn ' + (danger ? 'danger' : '') + '" data-x="yes">确定</button></div>',
      { onMount: (mask, close) => {
        XU.$('[data-x=no]', mask).onclick = close;
        XU.$('[data-x=yes]', mask).onclick = () => { close(); onYes(); };
      } }
    );
  };

  XU.copy = async function (text, msg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    }
    XU.toast(msg || '已复制到剪贴板');
  };

  XU.openUrl = function (url) {
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  };

  XU.videoCard = function (v, opts) {
    opts = opts || {};
    const cover = v.cover || '';
    return '<div class="video-card" data-url="' + XU.esc(v.url || '') + '">' +
      (cover ? '<img src="' + XU.esc(cover) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '<div style="width:86px;height:58px;border-radius:10px;flex:0 0 auto;background:var(--primary-soft);display:flex;align-items:center;justify-content:center;color:var(--primary)">' + XU.icon('play') + '</div>') +
      '<div class="grow"><div class="vt">' + XU.esc(v.title || '') + '</div>' +
      '<div class="vd">' + XU.esc(v.author || '') + (v.duration ? ' · ' + XU.esc(v.duration) : '') + '</div></div>' +
      '<span class="play-badge">' + XU.icon('play', 's16') + '</span></div>';
  };

  /* 视频卡事件委托 */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.video-card');
    if (card) {
      const url = card.getAttribute('data-url');
      if (url) XU.openUrl(url);
    }
  });

  /* ---------- 导航与路由 ---------- */
  const rail = XU.$('#rail');
  const content = XU.$('#content');
  let current = 'home';

  function buildNav() {
    let html = '<div class="brand"><b>xu</b><span>工作台</span></div>';
    PANELS.forEach((p) => {
      html += '<button class="nav-item" data-panel="' + p.id + '" title="' + p.label + '">' +
        XU.icon(p.id) + '<span>' + p.label + '</span></button>';
    });
    rail.innerHTML = html;
    rail.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item');
      if (btn) location.hash = '#/' + btn.getAttribute('data-panel');
    });
  }

  async function route() {
    const id = (location.hash.replace('#/', '') || 'home').split('?')[0];
    if (!PANELS.some((p) => p.id === id)) { location.hash = '#/home'; return; }
    current = id;
    XU.$$('.nav-item', rail).forEach((b) => b.classList.toggle('active', b.getAttribute('data-panel') === id));
    content.innerHTML = '';
    try {
      const renderer = XU.panels[id];
      if (!renderer) throw new Error('no panel');
      await renderer(content);
    } catch (err) {
      content.innerHTML = '<div class="panel"><div class="card"><h2>加载失败</h2><p class="sub">' + XU.esc(err && err.message ? err.message : String(err)) + '</p><button class="btn" onclick="location.reload()">重试</button></div></div>';
    }
    content.scrollTop = 0;
  }
  XU.route = route;

  /* ---------- 启动 ---------- */
  async function boot() {
    buildNav();
    await loadMeta();
    window.addEventListener('hashchange', route);
    await route();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'XU_UPDATE') location.reload();
      });
    }
  }

  /* ---------- 安装提示 ---------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    XU.meta.canInstall = true;
  });
  XU.installHint = function () {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return '';
    if (isIOS) {
      return '<div class="card" style="background:var(--card-tint)"><h2>📲 安装到手机</h2><p class="sub">苹果手机：点底部「分享」按钮 → 「添加到主屏幕」，就能像 App 一样全屏使用。</p></div>';
    }
    if (XU.meta.canInstall) {
      return '<div class="card" style="background:var(--card-tint)"><h2>📲 安装到手机</h2><p class="sub">添加到主屏幕，全屏使用，离线也能看。</p><button class="btn" id="btnInstall">立即安装</button></div>';
    }
    return '';
  };
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btnInstall' && deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
    }
  });

  boot();
})();
