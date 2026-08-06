/* panels/goals.js —— 目标：长期/短期目标 + 里程碑步骤 + 今日待办 + 进度 */
(function () {
  const XU = window.XU;
  const KEY = 'goals';
  const TYPES = [
    { id: 'health', emoji: '💪', label: '健康' },
    { id: 'study', emoji: '📚', label: '学习' },
    { id: 'work', emoji: '💼', label: '工作' },
    { id: 'money', emoji: '💰', label: '财务' },
    { id: 'life', emoji: '🌸', label: '生活' },
    { id: 'fun', emoji: '🎯', label: '兴趣' }
  ];

  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    return rec && rec.goals ? rec : { goals: [] };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function typeOf(id) { return TYPES.find((t) => t.id === id) || TYPES[5]; }
  function progressOf(g) {
    if (!g.steps || !g.steps.length) return g.done ? 100 : 0;
    const done = g.steps.filter((s) => s.done).length;
    return Math.round((done / g.steps.length) * 100);
  }
  function daysLeft(g) {
    if (!g.due) return null;
    const d = new Date(g.due + 'T00:00:00');
    const now = new Date();
    const diff = Math.ceil((d - now) / 86400000);
    return diff;
  }

  XU.regPanel('goals', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    let tab = 'open';

    function statCard(emoji, num2, lab) {
      return '<div class="stat-card"><div class="ico">' + emoji + '</div><div class="num">' + num2 + '</div><div class="lab">' + lab + '</div></div>';
    }

    function renderStats() {
      const open = data.goals.filter((g) => !g.done);
      const done = data.goals.filter((g) => g.done);
      const todo = open.reduce((n, g) => n + (g.steps || []).filter((s) => !s.done).length, 0);
      const box = XU.$('#goalStats', el);
      box.innerHTML =
        statCard('🚀', open.length, '进行中') +
        statCard('🏆', done.length, '已完成') +
        statCard('✅', todo, '今日待办');
    }

    function goalCard(g) {
      const p = progressOf(g);
      const t = typeOf(g.type);
      const left = daysLeft(g);
      const steps = g.steps || [];
      return '<div class="card" data-gid="' + g.id + '" style="margin-bottom:10px">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">' +
          '<div style="min-width:0">' +
            '<div class="title" style="font-weight:800;font-size:15px">' + t.emoji + ' ' + XU.esc(g.title) + '</div>' +
            '<div class="vd">' + t.label + (g.due ? ' · 截止 ' + XU.esc(g.due) + (left !== null ? '（' + (left >= 0 ? '还剩 ' + left + ' 天' : '已超期 ' + Math.abs(left) + ' 天') + '）' : '') : '') + '</div>' +
          '</div>' +
          '<div style="text-align:right;flex:0 0 auto">' +
            '<div class="num" style="font-weight:800;color:var(--primary)">' + p + '%</div>' +
          '</div>' +
        '</div>' +
        (g.desc ? '<p class="sub" style="margin:6px 0">' + XU.esc(g.desc) + '</p>' : '') +
        '<div class="progress" style="margin:8px 0"><i style="width:' + p + '%"></i></div>' +
        (steps.length ? '<div class="list" style="margin-bottom:8px">' + steps.map((s, i) =>
          '<div class="row-item" style="padding:5px 0;cursor:pointer" data-step="' + i + '">' +
            '<div style="width:22px;height:22px;border-radius:7px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border:1.6px solid ' + (s.done ? 'var(--ok)' : 'var(--primary-soft)') + ';color:' + (s.done ? 'var(--ok)' : 'transparent') + ';font-size:13px">✓</div>' +
            '<div class="grow"><div class="desc" style="' + (s.done ? 'text-decoration:line-through;color:var(--muted)' : '') + '">' + XU.esc(s.text) + '</div></div>' +
          '</div>').join('') + '</div>' : '') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          (g.done ? '<button class="btn mini" data-reopen="' + g.id + '">重新开始</button>' : '<button class="btn mini" data-finish="' + g.id + '">🏆 完成目标</button>') +
          '<button class="btn mini ghost" data-edit="' + g.id + '">' + XU.icon('edit') + ' 编辑</button>' +
          '<button class="btn mini danger" data-del="' + g.id + '">' + XU.icon('trash') + '</button>' +
        '</div>' +
      '</div>';
    }

    function renderList() {
      const box = XU.$('#goalList', el);
      const goals = data.goals.filter((g) => (tab === 'done') === !!g.done);
      box.innerHTML = goals.length
        ? goals.map(goalCard).join('')
        : '<div class="empty">' + (tab === 'open' ? '还没有目标，点「＋ 立个目标」开始 🚀' : '还没有完成的目标，加油！') + '</div>';
    }

    function renderToday() {
      const box = XU.$('#goalToday', el);
      const open = data.goals.filter((g) => !g.done);
      const items = [];
      open.forEach((g) => (g.steps || []).forEach((s, i) => { if (!s.done) items.push({ goal: g, idx: i, text: g.title + '：' + s.text }); }));
      box.innerHTML = items.length
        ? items.map((it) =>
            '<div class="row-item" style="cursor:pointer" data-todo="' + it.goal.id + '" data-i="' + it.idx + '">' +
              '<div style="width:26px;height:26px;border-radius:8px;background:var(--primary-soft);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:13px;flex:0 0 auto">→</div>' +
              '<div class="grow"><div class="desc">' + XU.esc(it.text) + '</div></div></div>').join('')
        : '<div class="empty">太棒了，当前没有待办 ✅</div>';
    }

    el.innerHTML =
      '<div class="hero">' +
        '<h2 style="color:#fff;margin:0 0 4px">🎯 我的目标</h2>' +
        '<p style="margin:0;font-size:12.5px;opacity:.92">把大目标拆成小步骤，每天进步一点点</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="grid3" id="goalStats"></div>' +
        '<button class="btn" style="width:100%;margin-top:12px;padding:14px" id="goalAdd">＋ 立个目标</button>' +
      '</div>' +
      '<div class="card"><h2>✅ 今日待办</h2><p class="sub">来自所有进行中目标的未完成步骤</p><div class="list" id="goalToday"></div></div>' +
      '<div class="card">' +
        '<div class="tabs" id="goalTabs">' +
          '<button class="tab active" data-t="open">进行中</button>' +
          '<button class="tab" data-t="done">已完成</button>' +
        '</div>' +
        '<div class="list" id="goalList" style="margin-top:10px"></div>' +
      '</div>';

    renderStats(); renderList(); renderToday();

    XU.$('#goalAdd', el).onclick = () => goalModal();
    XU.$('#goalTabs', el).addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      tab = b.getAttribute('data-t');
      XU.$$('#goalTabs .tab', el).forEach((x) => x.classList.toggle('active', x === b));
      renderList();
    });

    function goalModal(goal) {
      const g = goal || { title: '', type: 'study', due: '', desc: '', steps: [], done: false };
      XU.modal(
        '<h3>🎯 ' + (goal ? '编辑目标' : '立个目标') + '</h3>' +
        '<label class="lbl">目标名称</label><input type="text" id="gTitle" maxlength="40" value="' + XU.esc(g.title) + '" placeholder="例如：三个月瘦 5 斤">' +
        '<label class="lbl">类型</label>' +
        '<div class="seg" id="gType">' + TYPES.map((t) => '<button data-v="' + t.id + '"' + (t.id === g.type ? ' class="on"' : '') + '>' + t.emoji + ' ' + t.label + '</button>').join('') + '</div>' +
        '<div class="grid2">' +
          '<div><label class="lbl">截止日期（可选）</label><input type="date" id="gDue" value="' + XU.esc(g.due || '') + '"></div>' +
          '<div><label class="lbl">说明（可选）</label><input type="text" id="gDesc" maxlength="80" value="' + XU.esc(g.desc || '') + '" placeholder="一句话说明"></div>' +
        '</div>' +
        '<label class="lbl">里程碑步骤（每行一条，点击即可打卡）</label>' +
        '<textarea id="gSteps" rows="4" placeholder="例如：&#10;每天运动 30 分钟&#10;少喝含糖饮料">' + (g.steps || []).map((s) => s.text).join('\n') + '</textarea>' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
        { onMount: (mask, close) => {
          let type = g.type;
          XU.$('#gType', mask).addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            type = b.getAttribute('data-v');
            XU.$$('#gType button', mask).forEach((x) => x.classList.toggle('on', x === b));
          });
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const title = XU.$('#gTitle', mask).value.trim();
            if (!title) { XU.toast('请填写目标名称'); return; }
            const steps = XU.$('#gSteps', mask).value.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => ({ text: s, done: false }));
            if (goal) {
              Object.assign(goal, { title: title, type: type, due: XU.$('#gDue', mask).value, desc: XU.$('#gDesc', mask).value.trim(), steps: steps });
            } else {
              data.goals.push({ id: 'g' + Date.now().toString(36), title: title, type: type, due: XU.$('#gDue', mask).value, desc: XU.$('#gDesc', mask).value.trim(), steps: steps, done: false, time: XU.now() });
            }
            await saveData(data);
            close(); renderStats(); renderList(); renderToday();
            XU.toast('目标已保存 🎯');
          };
        } }
      );
    }

    el.addEventListener('click', async (e) => {
      const step = e.target.closest('[data-step]');
      if (step) {
        const card = step.closest('.card');
        const goal = data.goals.find((x) => x.id === card.getAttribute('data-gid'));
        if (!goal || !goal.steps) return;
        const idx = parseInt(step.getAttribute('data-step'), 10);
        if (idx >= goal.steps.length) return;
        goal.steps[idx].done = !goal.steps[idx].done;
        await saveData(data);
        renderStats(); renderList(); renderToday();
        return;
      }
      const todo = e.target.closest('[data-todo]');
      if (todo) {
        const goal = data.goals.find((x) => x.id === todo.getAttribute('data-todo'));
        const i = parseInt(todo.getAttribute('data-i'), 10);
        if (goal && goal.steps[i]) {
          goal.steps[i].done = true;
          await saveData(data);
          renderStats(); renderList(); renderToday();
          XU.toast('完成一步，继续加油 💪');
        }
        return;
      }
      const finish = e.target.closest('[data-finish]');
      if (finish) {
        const goal = data.goals.find((x) => x.id === finish.getAttribute('data-finish'));
        if (goal) {
          goal.done = true;
          (goal.steps || []).forEach((s) => { s.done = true; });
          await saveData(data);
          renderStats(); renderList(); renderToday();
          XU.toast('🎉 恭喜完成目标：' + goal.title);
        }
        return;
      }
      const reopen = e.target.closest('[data-reopen]');
      if (reopen) {
        const goal = data.goals.find((x) => x.id === reopen.getAttribute('data-reopen'));
        if (goal) { goal.done = false; await saveData(data); renderStats(); renderList(); renderToday(); }
        return;
      }
      const edit = e.target.closest('[data-edit]');
      if (edit) {
        const goal = data.goals.find((x) => x.id === edit.getAttribute('data-edit'));
        if (goal) goalModal(goal);
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        const goal = data.goals.find((x) => x.id === del.getAttribute('data-del'));
        if (goal) {
          XU.confirm('删除目标「' + goal.title + '」？', async () => {
            data.goals = data.goals.filter((x) => x.id !== goal.id);
            await saveData(data);
            renderStats(); renderList(); renderToday();
          }, true);
        }
      }
    });
  });
})();