/* panels/diary.js —— 日记：每日反思 + 三问模板 + 历史回顾 */
(function () {
  const XU = window.XU;
  const STORE_KEY = 'diary';

  async function getData() {
    const rec = await XU.Store.kvGet(STORE_KEY);
    return rec && rec.entries ? rec : { entries: {} };
  }

  XU.regPanel('diary', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    const today = XU.today();
    const todayRec = data.entries[today] || {};

    el.innerHTML =
      '<div class="card">' +
        '<h2>📔 每日反思</h2>' +
        '<p class="sub">每天三个问题，把日子过明白</p>' +
        '<label class="lbl">① 今天我做成的一件小事</label>' +
        '<input type="text" id="dWin" maxlength="80" placeholder="例如：完成了报告初稿" value="' + XU.esc(todayRec.win || '') + '">' +
        '<label class="lbl">② 今天我感恩的一件事</label>' +
        '<input type="text" id="dGrat" maxlength="80" placeholder="例如：朋友请我喝咖啡" value="' + XU.esc(todayRec.grat || '') + '">' +
        '<label class="lbl">③ 明天我最想做好的一件事</label>' +
        '<input type="text" id="dPlan" maxlength="80" placeholder="例如：早起跑步 3 公里" value="' + XU.esc(todayRec.plan || '') + '">' +
        '<label class="lbl">自由记录（可选）</label>' +
        '<textarea id="dNote" rows="3" maxlength="500" placeholder="今天有什么想对自己说的？">' + XU.esc(todayRec.note || '') + '</textarea>' +
        '<div class="actions"><button class="btn ghost" id="dClear">清空今日</button><button class="btn" id="dSave">保存日记</button></div>' +
      '</div>' +
      '<div class="card">' +
        '<h2>🗂️ 历史日记</h2>' +
        '<p class="sub">回看过去，才能看见成长</p>' +
        '<div class="list" id="diaryList"></div>' +
      '</div>';

    function renderList() {
      const keys = Object.keys(data.entries).sort().reverse();
      const listEl = XU.$('#diaryList', el);
      listEl.innerHTML = keys.length
        ? keys.map((k) => {
            const e = data.entries[k];
            const preview = e.win || e.grat || e.plan || e.note || '';
            return '<div class="row-item" style="cursor:pointer" data-day="' + k + '">' +
              '<div style="width:42px;height:42px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:16px;flex:0 0 auto;font-weight:800;color:var(--primary)">' + String(parseInt(k.slice(8, 10), 10)) + '</div>' +
              '<div class="grow"><div class="title">' + k + '</div>' +
              '<div class="desc">' + XU.esc(preview.slice(0, 40)) + '</div></div>' +
              '<button class="btn mini danger" data-del="' + k + '">' + XU.icon('trash') + '</button>' +
            '</div>';
          }).join('')
        : '<div class="empty">还没有日记，从今天开始写第一篇吧</div>';
    }
    renderList();

    XU.$('#dSave', el).onclick = async () => {
      const rec = {
        win: XU.$('#dWin', el).value.trim(),
        grat: XU.$('#dGrat', el).value.trim(),
        plan: XU.$('#dPlan', el).value.trim(),
        note: XU.$('#dNote', el).value.trim(),
        time: XU.now()
      };
      if (!rec.win && !rec.grat && !rec.plan && !rec.note) { XU.toast('写点什么再保存吧'); return; }
      data.entries[today] = rec;
      await XU.Store.kvSet(STORE_KEY, data);
      renderList();
      XU.toast('日记已保存 📔');
    };
    XU.$('#dClear', el).onclick = async () => {
      delete data.entries[today];
      await XU.Store.kvSet(STORE_KEY, data);
      XU.$('#dWin', el).value = XU.$('#dGrat', el).value = XU.$('#dPlan', el).value = XU.$('#dNote', el).value = '';
      renderList();
      XU.toast('已清空今日日记');
    };

    XU.$('#diaryList', el).addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      const open = e.target.closest('[data-day]');
      if (del) {
        const day = del.getAttribute('data-del');
        XU.confirm('删除 ' + day + ' 的日记？', async () => {
          delete data.entries[day];
          await XU.Store.kvSet(STORE_KEY, data);
          renderList();
        }, true);
        return;
      }
      if (open) {
        const day = open.getAttribute('data-day');
        const e2 = data.entries[day];
        if (!e2) return;
        let html = '<h3>📔 ' + day + '</h3>';
        if (e2.win) html += '<p style="margin:6px 0"><b>💪 做成的事</b><br>' + XU.esc(e2.win) + '</p>';
        if (e2.grat) html += '<p style="margin:6px 0"><b>🙏 感恩</b><br>' + XU.esc(e2.grat) + '</p>';
        if (e2.plan) html += '<p style="margin:6px 0"><b>🎯 明日计划</b><br>' + XU.esc(e2.plan) + '</p>';
        if (e2.note) html += '<p style="margin:6px 0"><b>📝 记录</b><br>' + XU.esc(e2.note) + '</p>';
        html += '<p class="sub">' + XU.esc(e2.time || '') + '</p>';
        XU.modal(html);
      }
    });
  });
})();
