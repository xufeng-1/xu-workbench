/* panels/todos.js —— 待办清单：优先级+状态+日期，本地存储 */
(function () {
  const XU = window.XU;
  const KEY = 'todos_items';

  function esc(s) { return XU.esc(s); }

  async function getData() {
    try { const r = await XU.Store.kvGet(KEY); if (r && r.items) return r; } catch (e) {}
    return { items: [] };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  const PRI = { high: ['🔴', '重要紧急'], mid: ['🟠', '重要不紧急'], low: ['🔵', '日常琐事'] };

  XU.regPanel('todos', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();

    function render() {
      const done = data.items.filter((it) => it.done);
      const open = data.items.filter((it) => !it.done)
        .sort((a, b) => (PRI[a.pri][0] < PRI[b.pri][0] ? -1 : 1) || (a.date || '').localeCompare(b.date || ''));
      const total = data.items.length;

      function row(it) {
        const p = PRI[it.pri] || PRI.mid;
        return '<div class="td-row' + (it.done ? ' done' : '') + '">' +
          '<button class="td-check' + (it.done ? ' on' : '') + '" data-id="' + it.id + '" aria-label="完成">' +
          (it.done ? '✓' : '') + '</button>' +
          '<div class="grow">' +
          '<div class="td-text">' + esc(it.text) + '</div>' +
          '<div class="td-meta">' + p[0] + ' ' + p[1] +
          (it.date ? ' · ' + it.date : '') + '</div></div>' +
          '<button class="btn mini ghost td-edit" data-id="' + it.id + '">✎</button>' +
          '<button class="btn mini ghost td-del" data-id="' + it.id + '">✕</button></div>';
      }

      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">✅ 待办清单</h2><p style="margin:0;font-size:12.5px;opacity:.92">重要优先 · 今日事今日毕</p></div>' +
        '<div class="card" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
        '<input class="input grow" id="tdInput" placeholder="输入新任务，如：给妈妈打电话" maxlength="40">' +
        '<select class="input" id="tdPri" style="width:auto"><option value="high">🔴 重要紧急</option><option value="mid" selected>🟠 重要不紧急</option><option value="low">🔵 日常琐事</option></select>' +
        '<input class="input" id="tdDate" type="date" style="width:auto">' +
        '<button class="btn" id="tdAdd">添加</button></div>' +
        (total ? '<div class="card"><h2>📋 进行中（' + open.length + '）</h2>' +
          (open.length ? '<div class="list">' + open.map(row).join('') + '</div>' : '<p class="sub">全部完成，太棒了！</p>') + '</div>' +
          (done.length ? '<div class="card"><h2>✔ 已完成（' + done.length + '）</h2><div class="list">' + done.map(row).join('') + '</div></div>' : '') : '') +
        (total ? '<div class="card sub" style="text-align:center">完成 ' + done.length + ' / ' + total + ' · ' + Math.round(done.length / total * 100) + '%</div>' : '') +
        '<p class="sub" style="text-align:center;margin:14px 0">💡 完成的越多，越有成就感～</p>';

      XU.$('#tdAdd', el).onclick = addTask;
      XU.$('#tdInput', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
      XU.$$('.td-check', el).forEach((b) => b.onclick = async () => {
        const it = data.items.find((x) => x.id === b.getAttribute('data-id'));
        if (!it) return;
        it.done = !it.done;
        await saveData(data); render();
      });
      XU.$$('.td-del', el).forEach((b) => b.onclick = () => {
        const it = data.items.find((x) => x.id === b.getAttribute('data-id'));
        if (!it) return;
        XU.confirm('删除「' + it.text + '」？', async () => {
          data.items = data.items.filter((x) => x.id !== it.id);
          await saveData(data); render(); XU.toast('已删除');
        });
      });
      XU.$$('.td-edit', el).forEach((b) => b.onclick = () => {
        const it = data.items.find((x) => x.id === b.getAttribute('data-id'));
        if (!it) return;
        XU.modal(
          '<h3>✎ 编辑任务</h3><div style="display:flex;flex-direction:column;gap:10px">' +
          '<input class="input" id="tdEText" value="' + esc(it.text) + '" maxlength="40">' +
          '<select class="input" id="tdEPri"><option value="high"' + (it.pri === 'high' ? ' selected' : '') + '>🔴 重要紧急</option><option value="mid"' + (it.pri === 'mid' ? ' selected' : '') + '>🟠 重要不紧急</option><option value="low"' + (it.pri === 'low' ? ' selected' : '') + '>🔵 日常琐事</option></select>' +
          '<input class="input" id="tdEDate" type="date" value="' + (it.date || XU.today()) + '">' +
          '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" id="tdESave">保存</button></div></div>',
          { onMount: (mask, close) => {
            XU.$('[data-x=no]', mask).onclick = close;
            XU.$('#tdESave', mask).onclick = async () => {
              const t = XU.$('#tdEText', mask).value.trim();
              if (!t) { XU.toast('内容不能为空'); return; }
              it.text = t; it.pri = XU.$('#tdEPri', mask).value; it.date = XU.$('#tdEDate', mask).value;
              await saveData(data); render(); close(); XU.toast('已保存');
            };
          } }
        );
      });
    }

    function addTask() {
      const text = XU.$('#tdInput', el).value.trim();
      if (!text) { XU.toast('请输入任务内容'); return; }
      data.items.push({ id: 't' + Date.now(), text: text, pri: XU.$('#tdPri', el).value, date: XU.$('#tdDate', el).value || '', done: false });
      XU.$('#tdInput', el).value = '';
      saveData(data).then(render);
    }

    render();
  });
})();