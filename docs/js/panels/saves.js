/* panels/saves.js —— 收藏：统一收藏视频 / 菜谱 / 金句 / 书籍 / 链接 */
(function () {
  const XU = window.XU;

  const TYPES = [
    { id: 'video', label: '视频', emoji: '🎬' },
    { id: 'recipe', label: '菜谱', emoji: '🍲' },
    { id: 'quote', label: '金句', emoji: '💬' },
    { id: 'book', label: '书籍', emoji: '📚' },
    { id: 'link', label: '链接', emoji: '🔗' }
  ];
  const STORE_KEY = 'saves';

  async function getData() {
    const rec = await XU.Store.kvGet(STORE_KEY);
    return rec && rec.items ? rec : { items: [] };
  }

  XU.regPanel('saves', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    let curType = 'all';
    let kw = '';

    el.innerHTML =
      '<div class="card">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<h2>⭐ 我的收藏</h2>' +
          '<button class="btn mini" id="savesAdd">' + XU.icon('plus') + ' 收藏</button>' +
        '</div>' +
        '<p class="sub">把喜欢的视频、菜谱、金句、书籍都收进来，随手可查</p>' +
        '<input type="search" id="savesSearch" placeholder="🔍 搜索标题或备注…">' +
        '<div class="tabs" id="savesTabs">' +
          '<button class="tab active" data-t="all">全部</button>' +
          TYPES.map((t) => '<button class="tab" data-t="' + t.id + '">' + t.emoji + ' ' + t.label + '</button>').join('') +
        '</div>' +
        '<div class="list" id="savesList"></div>' +
      '</div>';

    const listEl = XU.$('#savesList', el);

    function typeInfo(id) { return TYPES.find((t) => t.id === id) || TYPES[4]; }

    function render() {
      const kwl = kw.trim().toLowerCase();
      let items = data.items.slice().reverse();
      if (curType !== 'all') items = items.filter((it) => it.type === curType);
      if (kwl) items = items.filter((it) => (it.title || '').toLowerCase().includes(kwl) || (it.note || '').toLowerCase().includes(kwl) || (it.tags || '').toLowerCase().includes(kwl));
      listEl.innerHTML = items.length
        ? items.map((it) => {
            const t = typeInfo(it.type);
            return '<div class="row-item">' +
              '<div style="width:42px;height:42px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:20px;flex:0 0 auto">' + t.emoji + '</div>' +
              '<div class="grow"><div class="title">' + XU.esc(it.title || '未命名') + '</div>' +
              '<div class="desc">' + t.label + (it.tags ? ' · ' + XU.esc(it.tags) : '') + (it.note ? ' · ' + XU.esc(it.note) : '') + '</div>' +
              '<div class="vd">' + XU.esc(it.time || '') + '</div></div>' +
              (it.url ? '<button class="btn mini ghost" data-open="' + it.id + '">打开</button>' : '') +
              '<button class="btn mini danger" data-del="' + it.id + '">' + XU.icon('trash') + '</button>' +
            '</div>';
          }).join('')
        : '<div class="empty">还没有收藏，点右上角「收藏」添加第一条吧</div>';
    }
    render();

    XU.$('#savesTabs', el).addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      curType = b.getAttribute('data-t');
      XU.$$('.tab', XU.$('#savesTabs', el)).forEach((x) => x.classList.toggle('active', x === b));
      render();
    });
    XU.$('#savesSearch', el).addEventListener('input', (e) => { kw = e.target.value; render(); });

    function addModal() {
      XU.modal(
        '<h3>⭐ 添加收藏</h3>' +
        '<label class="lbl">类型</label>' +
        '<div class="seg" id="sType">' + TYPES.map((t) => '<button data-t="' + t.id + '">' + t.emoji + ' ' + t.label + '</button>').join('') + '</div>' +
        '<label class="lbl">标题</label><input type="text" id="sTitle" maxlength="60" placeholder="例如：水煮肉片做法">' +
        '<label class="lbl">链接（可选）</label><input type="url" id="sUrl" placeholder="https://…">' +
        '<label class="lbl">标签（可选，空格分隔）</label><input type="text" id="sTags" maxlength="40" placeholder="例如：川菜 快手">' +
        '<label class="lbl">备注（可选）</label><input type="text" id="sNote" maxlength="80" placeholder="为什么想收藏它？">' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
        { onMount: (mask, close) => {
          let type = 'video';
          XU.$('#sType', mask).addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            type = b.getAttribute('data-t');
            XU.$$('#sType button', mask).forEach((x) => x.classList.toggle('on', x === b));
          });
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const title = XU.$('#sTitle', mask).value.trim();
            if (!title) { XU.toast('请输入标题'); return; }
            data.items.push({
              id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              type: type,
              title: title,
              url: XU.$('#sUrl', mask).value.trim(),
              tags: XU.$('#sTags', mask).value.trim(),
              note: XU.$('#sNote', mask).value.trim(),
              time: XU.now()
            });
            data.items = data.items.slice(-300);
            await XU.Store.kvSet(STORE_KEY, data);
            close(); render(); XU.toast('已收藏 ⭐');
          };
        } }
      );
    }
    XU.$('#savesAdd', el).onclick = addModal;

    listEl.addEventListener('click', async (e) => {
      const del = e.target.closest('[data-del]');
      const open = e.target.closest('[data-open]');
      if (del) {
        const id = del.getAttribute('data-del');
        XU.confirm('删除这条收藏？', async () => {
          data.items = data.items.filter((it) => it.id !== id);
          await XU.Store.kvSet(STORE_KEY, data);
          render();
        }, true);
      }
      if (open) {
        const it = data.items.find((x) => x.id === open.getAttribute('data-open'));
        if (it && it.url) XU.openUrl(it.url);
      }
    });
  });
})();
