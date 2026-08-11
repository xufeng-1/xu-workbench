/* panels/countdown.js —— 倒数日：重要日子倒计时 / 纪念日已过天数（本地存储） */
(function () {
  const XU = window.XU;
  const KEY = 'countdown_items';
  const EMOJIS = ['🎂', '🎓', '💍', '✈️', '🏠', '💰', '❤️', '🎯', '📝', '🎊'];

  function esc(s) { return XU.esc(s); }
  function pad(n) { return String(n).padStart(2, '0'); }

  async function getData() {
    try { const r = await XU.Store.kvGet(KEY); if (r && r.items) return r; } catch (e) {}
    return { items: [] };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function daysDiff(dateStr) {
    const t = new Date(XU.today() + 'T00:00:00').getTime();
    const d = new Date(dateStr + 'T00:00:00').getTime();
    return Math.round((d - t) / 86400000);
  }

  XU.regPanel('countdown', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();

    function render() {
      const today = new Date(XU.today() + 'T00:00:00').getTime();
      const future = data.items.filter((it) => new Date(it.date + 'T00:00:00').getTime() >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
      const past = data.items.filter((it) => new Date(it.date + 'T00:00:00').getTime() < today)
        .sort((a, b) => b.date.localeCompare(a.date));

      function card(it) {
        const diff = daysDiff(it.date);
        const isFuture = diff >= 0;
        return '<div class="cd-card">' +
          '<div class="cd-emo">' + esc(it.emoji || '📌') + '</div>' +
          '<div class="grow"><div class="cd-title">' + esc(it.title) + '</div>' +
          '<div class="cd-date">' + it.date + (it.note ? ' · ' + esc(it.note) : '') + '</div></div>' +
          '<div style="text-align:right">' +
          '<div class="cd-num ' + (isFuture ? 'future' : 'past') + '">' + (isFuture ? diff : -diff) + '</div>' +
          '<div class="cd-lab">' + (isFuture ? '天后' : '天前') + '</div></div>' +
          '<button class="btn mini ghost cd-del" data-id="' + it.id + '">✕</button></div>';
      }

      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">⏳ 倒数日</h2><p style="margin:0;font-size:12.5px;opacity:.92">重要日子倒计时 · 生日/纪念日/考试/出行</p></div>' +
        (future.length ? '<div class="card"><h2>⏰ 即将到来</h2><div class="list">' + future.map(card).join('') + '</div></div>' : '') +
        (past.length ? '<div class="card"><h2>📖 已经历</h2><div class="list">' + past.map(card).join('') + '</div></div>' : '') +
        (data.items.length ? '' : '<div class="card"><p class="sub">还没有倒数日，点击下方按钮添加第一个吧～</p></div>') +
        '<button class="btn" id="cdAdd" style="width:100%">＋ 添加倒数日 / 纪念日</button>';

      XU.$('#cdAdd', el).onclick = addModal;
      XU.$$('.cd-del', el).forEach((b) => b.onclick = () => {
        const id = b.getAttribute('data-id');
        const it = data.items.find((x) => x.id === id);
        if (!it) return;
        XU.confirm('删除「' + it.title + '」？', async () => {
          data.items = data.items.filter((x) => x.id !== id);
          await saveData(data);
          XU.toast('已删除'); render();
        });
      });
    }

    function addModal() {
      XU.modal(
        '<h3>＋ 添加倒数日</h3>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<input class="input" id="cdTitle" placeholder="标题，如：我的生日 / 国庆假期" maxlength="30">' +
        '<input class="input" id="cdDate" type="date" value="' + XU.today() + '">' +
        '<input class="input" id="cdNote" placeholder="备注（选填）" maxlength="60">' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap" id="cdEmos">' + EMOJIS.map((e, i) =>
          '<button class="cd-emo-btn' + (i === 0 ? ' on' : '') + '" data-e="' + e + '">' + e + '</button>').join('') + '</div>' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" id="cdSave">保存</button></div></div>',
        { onMount: (mask, close) => {
          let emoji = EMOJIS[0];
          XU.$$('.cd-emo-btn', mask).forEach((b) => b.onclick = () => {
            XU.$$('.cd-emo-btn', mask).forEach((x) => x.classList.remove('on'));
            b.classList.add('on'); emoji = b.getAttribute('data-e');
          });
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('#cdSave', mask).onclick = async () => {
            const title = XU.$('#cdTitle', mask).value.trim();
            const date = XU.$('#cdDate', mask).value;
            if (!title || !date) { XU.toast('请填写标题和日期'); return; }
            data.items.push({ id: 'c' + Date.now(), title: title, date: date, note: XU.$('#cdNote', mask).value.trim(), emoji: emoji });
            await saveData(data);
            close(); XU.toast('已添加'); render();
          };
        } }
      );
    }

    render();
  });
})();