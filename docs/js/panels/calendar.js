/* panels/calendar.js —— 日历：月历视图 + 日程事件（本地存储） */
(function () {
  const XU = window.XU;
  const KEY = 'calendar_events';
  const COLORS = ['#7C6BD4', '#5FC98C', '#E8B04B', '#6FA8E8', '#E07A7A'];

  function esc(s) { return XU.esc(s); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ym(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  async function getData() {
    try { const r = await XU.Store.kvGet(KEY); if (r && r.events) return r; } catch (e) {}
    return { events: [] };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function eventsOf(events, date) { return events.filter((e) => e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '')); }

  function cellClass(dateStr, todayStr) {
    const cls = ['cal-cell'];
    if (dateStr === todayStr) cls.push('today');
    return cls.join(' ');
  }

  XU.regPanel('calendar', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    let cur = new Date();
    cur.setHours(0, 0, 0, 0);

    function render() {
      const y = cur.getFullYear(), m = cur.getMonth();
      const first = new Date(y, m, 1);
      const startDow = first.getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const todayStr = XU.today();
      const map = {};
      data.events.forEach((e) => { map[e.date] = (map[e.date] || 0) + 1; });

      let grid = '<div class="cal-head">' +
        '<button class="btn mini" id="calPrev">‹</button>' +
        '<div class="cal-title">' + y + '年' + (m + 1) + '月</div>' +
        '<button class="btn mini" id="calNext">›</button>' +
        '<button class="btn mini" id="calToday">今天</button></div>' +
        '<div class="cal-week">' + ['日', '一', '二', '三', '四', '五', '六'].map((w) => '<div>' + w + '</div>').join('') + '</div>' +
        '<div class="cal-grid">';
      for (let i = 0; i < startDow; i++) grid += '<div class="cal-cell blank"></div>';
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = ymd(new Date(y, m, d));
        grid += '<button class="' + cellClass(ds, todayStr) + '" data-d="' + d + '">' +
          '<span class="cal-num">' + d + '</span>' +
          (map[ds] ? '<span class="cal-dots"><i style="background:' + COLORS[0] + '"></i></span>' : '') +
          '</button>';
      }
      grid += '</div>';

      const sel = ymd(cur);
      const list = eventsOf(data.events, sel);
      let detail = '<div class="cal-detail"><div class="cal-date-title">' + sel + ' 日程</div>' +
        (list.length
          ? list.map((e, i) => '<div class="cal-event" style="border-left-color:' + esc(e.color || COLORS[0]) + '">' +
              '<div class="grow"><b>' + esc(e.title) + '</b>' + (e.time ? ' <span class="sub">' + esc(e.time) + '</span>' : '') +
              (e.note ? '<div class="desc">' + esc(e.note) + '</div>' : '') + '</div>' +
              '<button class="btn mini ghost" data-del="' + i + '">删除</button></div>').join('')
          : '<p class="sub">这一天还没有安排</p>') +
        '<button class="btn" id="calAdd" style="margin-top:10px">＋ 添加日程</button></div>';

      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">📅 日历</h2><p style="margin:0;font-size:12.5px;opacity:.92">日程安排 · 本地保存 · 每天自动更新</p></div>' +
        '<div class="card">' + grid + detail + '</div>';

      XU.$('#calPrev', el).onclick = () => { cur = new Date(y, m - 1, 1); render(); };
      XU.$('#calNext', el).onclick = () => { cur = new Date(y, m + 1, 1); render(); };
      XU.$('#calToday', el).onclick = () => { cur = new Date(); cur.setHours(0, 0, 0, 0); render(); };
      XU.$$('.cal-cell[data-d]', el).forEach((c) => c.onclick = () => { cur = new Date(y, m, +c.getAttribute('data-d')); render(); });
      XU.$('#calAdd', el).onclick = () => addModal(sel);
      XU.$$('[data-del]', el).forEach((b) => b.onclick = () => {
        const e = list[+b.getAttribute('data-del')];
        XU.confirm('删除日程「' + e.title + '」？', async () => {
          data.events = data.events.filter((x) => x !== e);
          await saveData(data);
          XU.toast('已删除'); render();
        });
      });
    }

    function addModal(date) {
      XU.modal(
        '<h3>＋ 添加日程</h3>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<input class="input" id="evTitle" placeholder="日程标题，如：健身 / 开会" maxlength="40">' +
        '<input class="input" id="evTime" placeholder="时间（选填），如：20:00">' +
        '<input class="input" id="evNote" placeholder="备注（选填）" maxlength="100">' +
        '<div style="display:flex;gap:6px;align-items:center" id="evColors">' + COLORS.map((c, i) =>
          '<button class="ev-color' + (i === 0 ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '"></button>').join('') + '</div>' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" id="evSave">保存</button></div></div>',
        { onMount: (mask, close) => {
          let color = COLORS[0];
          XU.$$('.ev-color', mask).forEach((b) => b.onclick = () => {
            XU.$$('.ev-color', mask).forEach((x) => x.classList.remove('on'));
            b.classList.add('on'); color = b.getAttribute('data-c');
          });
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('#evSave', mask).onclick = async () => {
            const title = XU.$('#evTitle', mask).value.trim();
            if (!title) { XU.toast('请输入标题'); return; }
            data.events.push({ id: 'e' + Date.now(), date: date, title: title, time: XU.$('#evTime', mask).value.trim(), note: XU.$('#evNote', mask).value.trim(), color: color });
            await saveData(data);
            close(); XU.toast('已添加'); render();
          };
        } }
      );
    }

    render();
  });
})();