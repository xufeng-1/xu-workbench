/* panels/notes.js —— 便签：快速记录 + 置顶 + 搜索（本地存储） */
(function () {
  const XU = window.XU;
  const KEY = 'notes_items';
  const NOTE_COLORS = ['#F7F5FE', '#EAF7EF', '#FDF3E0', '#EAF2FD', '#FDEBEB'];

  function esc(s) { return XU.esc(s); }

  async function getData() {
    try { const r = await XU.Store.kvGet(KEY); if (r && r.items) return r; } catch (e) {}
    return { items: [] };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  XU.regPanel('notes', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    let kw = '';

    function render() {
      let list = data.items.slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.ts - a.ts);
      if (kw) list = list.filter((n) => (n.title + ' ' + n.text).toLowerCase().indexOf(kw.toLowerCase()) >= 0);

      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">📝 便签</h2><p style="margin:0;font-size:12.5px;opacity:.92">随手记录灵感 · 本地保存</p></div>' +
        '<div class="card"><div style="display:flex;gap:8px">' +
        '<input class="input" id="ntSearch" placeholder="搜索便签…" value="' + esc(kw) + '" style="flex:1">' +
        '<button class="btn" id="ntAdd">＋ 新建</button></div></div>' +
        (list.length
          ? '<div class="nt-grid">' + list.map((n) =>
              '<div class="nt-card" style="background:' + (n.color || NOTE_COLORS[0]) + '">' +
              '<div class="nt-head"><b>' + esc(n.title || '无标题') + '</b>' + (n.pin ? ' 📌' : '') + '</div>' +
              (n.text ? '<div class="nt-text">' + esc(n.text) + '</div>' : '') +
              '<div class="nt-foot"><span class="sub">' + (n.ts ? XU.now() : '') + '</span>' +
              '<span><button class="nt-btn" data-pin="' + n.id + '">' + (n.pin ? '取消置顶' : '置顶') + '</button>' +
              '<button class="nt-btn" data-edit="' + n.id + '">编辑</button>' +
              '<button class="nt-btn danger" data-del="' + n.id + '">删除</button></span></div></div>').join('')
            : '<div class="card"><p class="sub">' + (kw ? '没有找到匹配的便签' : '还没有便签，点击「＋ 新建」开始记录') + '</p></div>') +
        '</div>';

      XU.$('#ntSearch', el).addEventListener('input', (e) => { kw = e.target.value; render(); });
      XU.$('#ntAdd', el).onclick = () => addModal(null);
      XU.$$('.nt-btn', el).forEach((b) => {
        const id = b.getAttribute('data-pin') || b.getAttribute('data-edit') || b.getAttribute('data-del');
        const n = data.items.find((x) => x.id === id);
        if (!n) return;
        b.onclick = async () => {
          if (b.hasAttribute('data-del')) {
            XU.confirm('删除这条便签？', async () => {
              data.items = data.items.filter((x) => x.id !== id);
              await saveData(data); XU.toast('已删除'); render();
            });
            return;
          }
          if (b.hasAttribute('data-pin')) {
            n.pin = !n.pin; await saveData(data); render(); return;
          }
          addModal(n);
        };
      });
    }

    function addModal(n) {
      XU.modal(
        '<h3>' + (n ? '✏️ 编辑便签' : '＋ 新建便签') + '</h3>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<input class="input" id="ntTitle" placeholder="标题" maxlength="30" value="' + esc(n ? n.title : '') + '">' +
        '<textarea class="input" id="ntText" rows="5" placeholder="写点什么…">' + esc(n ? n.text : '') + '</textarea>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap" id="ntColors">' + NOTE_COLORS.map((c, i) =>
          '<button class="ev-color' + ((n && n.color === c) || (!n && i === 0) ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '"></button>').join('') + '</div>' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" id="ntSave">保存</button></div></div>',
        { onMount: (mask, close) => {
          let color = n ? n.color : NOTE_COLORS[0];
          XU.$$('.ev-color', mask).forEach((b) => b.onclick = () => {
            XU.$$('.ev-color', mask).forEach((x) => x.classList.remove('on'));
            b.classList.add('on'); color = b.getAttribute('data-c');
          });
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('#ntSave', mask).onclick = async () => {
            const title = XU.$('#ntTitle', mask).value.trim() || '无标题';
            const text = XU.$('#ntText', mask).value.trim();
            if (!title && !text) { XU.toast('内容为空'); return; }
            if (n) { n.title = title; n.text = text; n.color = color; n.ts = Date.now(); }
            else data.items.push({ id: 'n' + Date.now(), title: title, text: text, color: color, pin: false, ts: Date.now() });
            await saveData(data);
            close(); XU.toast('已保存'); render();
          };
        } }
      );
    }

    render();
  });
})();