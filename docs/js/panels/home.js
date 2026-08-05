/* panels/home.js —— 首页：问候 / 统计卡 / 今日任务 */
(function () {
  const XU = window.XU;

  const DEFAULT_TASKS = [
    { text: '早睡（23:00前）', icon: '🌙' },
    { text: '早起（9:00前）', icon: '☀️' },
    { text: '健身运动1小时', icon: '💪' },
    { text: '英语口语练习30分钟', icon: '🗣️' },
    { text: '阅读书籍（提升）', icon: '📖' },
    { text: '写日记（反思）', icon: '📔' },
    { text: '学做一道菜', icon: '🍳' }
  ];

  async function getTasks() {
    let rec = await XU.Store.get('tasks', 'today');
    if (!rec) {
      let home = {};
      try { home = await XU.feed('home'); } catch (e) {}
      const list = (home.tasks && home.tasks.length ? home.tasks : DEFAULT_TASKS).map((t) => ({
        id: 't' + Date.now() + Math.random().toString(36).slice(2, 6),
        text: t.text || t, icon: t.icon || '✅', done: false, time: XU.now()
      }));
      rec = { id: 'today', date: XU.today(), list };
      await XU.Store.set('tasks', rec);
    }
    /* 迁移：移除已下线的「数据分析」默认任务，老数据自动清理 */
    const before = rec.list.length;
    rec.list = rec.list.filter((t) => !/数据分析/.test(t.text || ''));
    if (rec.list.length !== before) await XU.Store.set('tasks', rec);
    return rec;
  }
  XU.getTasks = getTasks;

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }
  function weekday() {
    const w = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()];
    return '星期' + w;
  }
  function pickQuote(quotes) {
    if (!quotes || !quotes.length) return '今天也要元气满满！';
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const q = quotes[seed % quotes.length];
    return q.text || q;
  }

  async function waterToday() {
    const rec = await XU.Store.get('water', XU.today());
    return rec ? rec.cups : 0;
  }
  async function workoutToday() {
    const rec = await XU.Store.get('workouts', XU.today());
    return rec ? rec.minutes : 0;
  }
  async function spendToday() {
    const all = await XU.Store.all('money');
    const t = XU.today();
    return all.filter((m) => m.date === t && m.type === 'out').reduce((s, m) => s + m.amount, 0);
  }

  function nowTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
  }
  function statCard(emoji, num, lab, accent) {
    return '<div class="stat-card">' +
      '<div class="ico" style="' + (accent ? 'background:' + accent + '22' : '') + '">' + emoji + '</div>' +
      '<div class="num" style="' + (accent ? 'color:' + accent : '') + '">' + num + '</div>' +
      '<div class="lab">' + lab + '</div></div>';
  }

  XU.regPanel('home', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const [home, quotes, tasksRec, cups, minutes, spent] = await Promise.all([
      XU.feed('home').catch(() => ({})),
      XU.feed('quotes').catch(() => []),
      getTasks(),
      waterToday(),
      workoutToday(),
      spendToday()
    ]);

    const daily = home.daily || {};
    const waterTarget = daily.waterTarget || 8;
    const workoutTarget = daily.workoutTarget || 60;

    el.innerHTML =
      XU.installHint() +
      '<div class="hero">' +
        '<h1>' + greeting() + '，xu 👋</h1>' +
        '<div class="time" id="homeClock">' + XU.today() + ' · ' + weekday() + ' ' + nowTime() + '</div>' +
        '<p>「' + XU.esc(pickQuote(quotes)) + '」</p>' +
      '</div>' +

      '<div class="grid2">' +
        statCard('✅', tasksRec.list.filter((t) => t.done).length + '/' + tasksRec.list.length, '今日任务', '') +
        statCard('💧', cups + '/' + waterTarget + '杯', '喝水进度', 'var(--water)') +
        statCard('💪', minutes + '/' + workoutTarget + '分', '运动打卡', 'var(--ok)') +
        statCard('💰', XU.money(spent), '今日花费', 'var(--warn)') +
      '</div>' +

      '<div class="card" style="margin-top:14px">' +
        '<h2>⚡ 快捷动作</h2><p class="sub">一键记录，让习惯变简单</p>' +
        '<div class="grid2" style="grid-template-columns:repeat(4,1fr)">' +
          '<button class="btn ghost mini" data-act="water" style="flex-direction:column;padding:12px 4px;height:auto">' + XU.icon('water') + '<span style="margin-top:4px">喝水+1杯</span></button>' +
          '<button class="btn ghost mini" data-act="workout" style="flex-direction:column;padding:12px 4px;height:auto">' + XU.icon('flame') + '<span style="margin-top:4px">运动+30分</span></button>' +
          '<button class="btn ghost mini" data-act="task" style="flex-direction:column;padding:12px 4px;height:auto">' + XU.icon('plus') + '<span style="margin-top:4px">新增任务</span></button>' +
          '<button class="btn ghost mini" data-act="money" style="flex-direction:column;padding:12px 4px;height:auto">' + XU.icon('wallet') + '<span style="margin-top:4px">记一笔</span></button>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<h2>📋 今日任务</h2>' +
          '<button class="btn mini ghost" id="addTask">' + XU.icon('plus') + ' 新增</button>' +
        '</div>' +
        '<p class="sub">点左侧圆圈完成打卡，可随时增删</p>' +
        '<div class="list" id="taskList"></div>' +
      '</div>';

    if (XU._clockTimer) clearInterval(XU._clockTimer);
    const clockEl = XU.$('#homeClock', el);
    if (clockEl) {
      const tick = () => { clockEl.textContent = XU.today() + ' · ' + weekday() + ' ' + nowTime(); };
      XU._clockTimer = setInterval(tick, 1000);
    }

    const taskListEl = XU.$('#taskList', el);
    function renderTasks() {
      const done = tasksRec.list.filter((t) => t.done).length;
      taskListEl.innerHTML = tasksRec.list.map((t) =>
        '<div class="row-item">' +
          '<div class="check' + (t.done ? ' on' : '') + '" data-toggle="' + t.id + '">' + XU.icon('check') + '</div>' +
          '<div class="grow"><div class="title" style="' + (t.done ? 'text-decoration:line-through;color:var(--muted)' : '') + '">' + (t.icon || '✅') + ' ' + XU.esc(t.text) + '</div></div>' +
          '<button class="btn mini danger" data-del="' + t.id + '">' + XU.icon('trash') + '</button>' +
        '</div>'
      ).join('') || '<div class="empty">今天还没有任务，点击右上角「新增」添加</div>';
    }
    renderTasks();

    taskListEl.addEventListener('click', async (e) => {
      const tog = e.target.closest('[data-toggle]');
      const del = e.target.closest('[data-del]');
      if (tog) {
        const t = tasksRec.list.find((x) => x.id === tog.getAttribute('data-toggle'));
        if (t) { t.done = !t.done; await XU.Store.set('tasks', tasksRec); renderTasks(); XU.toast(t.done ? '完成 🎉' : '已取消'); }
      }
      if (del) {
        const id = del.getAttribute('data-del');
        XU.confirm('删除这条任务？', async () => {
          tasksRec.list = tasksRec.list.filter((x) => x.id !== id);
          await XU.Store.set('tasks', tasksRec);
          renderTasks();
        }, true);
      }
    });

    XU.$('#addTask', el).onclick = () => addTaskModal(tasksRec, renderTasks);

    function addTaskModal(rec, rerender) {
      XU.modal(
        '<h3>新增任务</h3>' +
        '<label class="lbl">任务内容</label><input type="text" id="mText" maxlength="40" placeholder="例如：学习Python 1小时">' +
        '<label class="lbl">图标（可选，如 💪 📖 ☀️）</label><input type="text" id="mIcon" maxlength="2" placeholder="💪">' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">添加</button></div>',
        { onMount: (mask, close) => {
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const text = XU.$('#mText', mask).value.trim();
            if (!text) { XU.toast('请输入任务内容'); return; }
            rec.list.push({ id: 't' + Date.now(), text, icon: XU.$('#mIcon', mask).value.trim() || '✅', done: false, time: XU.now() });
            await XU.Store.set('tasks', rec);
            close(); rerender(); XU.toast('已添加');
          };
        } }
      );
    }

    /* 快捷动作 */
    el.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const kind = act.getAttribute('data-act');
      if (kind === 'water') {
        const rec = await XU.Store.get('water', XU.today());
        const cups = (rec ? rec.cups : 0) + 1;
        await XU.Store.set('water', { id: XU.today(), date: XU.today(), cups });
        XU.toast('已喝 ' + cups + ' 杯 💧');
        XU.route();
      } else if (kind === 'workout') {
        const rec = await XU.Store.get('workouts', XU.today());
        const minutes = (rec ? rec.minutes : 0) + 30;
        await XU.Store.set('workouts', { id: XU.today(), date: XU.today(), minutes });
        XU.toast('运动打卡 +30 分钟 🔥');
        XU.route();
      } else if (kind === 'task') {
        addTaskModal(tasksRec, renderTasks);
      } else if (kind === 'money') {
        if (XU.addMoney) XU.addMoney();
        else XU.toast('记账功能加载中');
      }
    });
  });
})();
