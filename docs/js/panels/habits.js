/* panels/habits.js —— 习惯：每日习惯打卡 + 连续天数 + 7 天打卡视图 */
(function () {
  const XU = window.XU;
  const STORE_KEY = 'habits';

  async function getData() {
    const rec = await XU.Store.kvGet(STORE_KEY);
    return rec && rec.habits ? rec : { habits: [], days: {} };
  }

  function streakFor(habitId, days) {
    const today = XU.today();
    let streak = 0;
    const d = new Date(today);
    /* 今天没打卡也不断签 */
    while (true) {
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const done = (days[key] || []).indexOf(habitId) >= 0;
      if (done) { streak++; d.setDate(d.getDate() - 1); continue; }
      if (key === today) { d.setDate(d.getDate() - 1); continue; }
      break;
    }
    return streak;
  }

  XU.regPanel('habits', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    const today = XU.today();
    const todayDone = new Set(data.days[today] || []);
    const SUGGEST = [
      { emoji: '💧', name: '喝 8 杯水' },
      { emoji: '📖', name: '阅读 30 分钟' },
      { emoji: '🏃', name: '运动 30 分钟' },
      { emoji: '😴', name: '23 点前睡觉' },
      { emoji: '🧘', name: '冥想 10 分钟' },
      { emoji: '✍️', name: '写日记' }
    ];

    el.innerHTML =
      '<div class="card">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<h2>🌱 习惯养成</h2>' +
          '<button class="btn mini" id="habitAdd">' + XU.icon('plus') + ' 新习惯</button>' +
        '</div>' +
        '<p class="sub">每天打卡一点点，坚持就是超能力</p>' +
        '<div class="list" id="habitList"></div>' +
        (data.habits.length ? '' : '<div class="empty">还没有习惯，点右上角添加一个吧</div>') +
      '</div>' +
      '<div class="card">' +
        '<h2>📅 最近 7 天</h2>' +
        '<div class="habit-week" id="habitWeek"></div>' +
      '</div>';

    const listEl = XU.$('#habitList', el);

    function render() {
      listEl.innerHTML = data.habits.map((h) => {
        const done = todayDone.has(h.id);
        const streak = streakFor(h.id, data.days);
        return '<div class="row-item">' +
          '<div class="check' + (done ? ' on' : '') + '" data-toggle="' + h.id + '">' + XU.icon('check') + '</div>' +
          '<div class="grow"><div class="title">' + h.emoji + ' ' + XU.esc(h.name) + '</div>' +
          '<div class="desc">连续 ' + streak + ' 天' + (done ? ' · 今天已完成 ✔' : '') + '</div></div>' +
          '<button class="btn mini danger" data-del="' + h.id + '">' + XU.icon('trash') + '</button>' +
        '</div>';
      }).join('');

      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const doneSet = new Set(data.days[key] || []);
        const pct = data.habits.length ? Math.round((data.habits.filter((h) => doneSet.has(h.id)).length / data.habits.length) * 100) : 0;
        days.push({ key, pct, label: key === today ? '今' : String(d.getDate()) });
      }
      XU.$('#habitWeek', el).innerHTML =
        '<div class="habit-week-row">' + days.map((d) =>
          '<div class="hw-day"><div class="hw-ring" style="background:conic-gradient(var(--ok) ' + d.pct + '%, var(--card-tint) ' + d.pct + '%)"><i>' + Math.round(d.pct) + '</i></div>' +
          '<div class="hw-wd">' + d.label + '</div></div>').join('') + '</div>' +
        '<p class="sub" style="text-align:center;margin-top:8px">圆环 = 当天习惯完成率</p>';
    }
    render();

    listEl.addEventListener('click', async (e) => {
      const tog = e.target.closest('[data-toggle]');
      const del = e.target.closest('[data-del]');
      if (tog) {
        const id = tog.getAttribute('data-toggle');
        if (todayDone.has(id)) { todayDone.delete(id); }
        else todayDone.add(id);
        data.days[today] = Array.from(todayDone);
        await XU.Store.kvSet(STORE_KEY, data);
        render();
      }
      if (del) {
        const id = del.getAttribute('data-del');
        XU.confirm('删除这个习惯？打卡记录也会一起删除', async () => {
          data.habits = data.habits.filter((h) => h.id !== id);
          data.days[today] = Array.from(todayDone).filter((x) => x !== id);
          todayDone.delete(id);
          await XU.Store.kvSet(STORE_KEY, data);
          render();
        }, true);
      }
    });

    function addModal() {
      XU.modal(
        '<h3>🌱 添加习惯</h3>' +
        '<label class="lbl">常用习惯（点选快速添加）</label>' +
        '<div class="habit-suggest">' + SUGGEST.map((s) => '<button data-s="' + s.name + '">' + s.emoji + ' ' + s.name + '</button>').join('') + '</div>' +
        '<label class="lbl">习惯名称</label><input type="text" id="hName" maxlength="20" placeholder="例如：早起喝水">' +
        '<label class="lbl">图标（emoji）</label><input type="text" id="hEmoji" maxlength="4" placeholder="🌱">' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">添加</button></div>',
        { onMount: (mask, close) => {
          XU.$('#hName', mask).value = '';
          XU.$('#hEmoji', mask).value = '✅';
          XU.$('.habit-suggest', mask).addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            XU.$('#hName', mask).value = b.getAttribute('data-s');
            XU.$('#hEmoji', mask).value = b.textContent.trim().slice(0, 2);
          });
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const name = XU.$('#hName', mask).value.trim();
            if (!name) { XU.toast('请输入习惯名称'); return; }
            data.habits.push({ id: 'h' + Date.now().toString(36), name, emoji: XU.$('#hEmoji', mask).value.trim() || '✅' });
            await XU.Store.kvSet(STORE_KEY, data);
            close(); render(); XU.toast('已添加习惯 🌱');
          };
        } }
      );
    }
    XU.$('#habitAdd', el).onclick = addModal;
  });
})();
