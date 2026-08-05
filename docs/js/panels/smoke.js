/* panels/smoke.js —— 抽烟记录：每根时间点 + 间隔分析 + 时段统计 */
(function () {
  const XU = window.XU;
  const KEY = 'smoke';
  const SLOTS = [
    { id: 0, label: '凌晨', range: [0, 6] },
    { id: 1, label: '早晨', range: [6, 9] },
    { id: 2, label: '上午', range: [9, 12] },
    { id: 3, label: '中午', range: [12, 14] },
    { id: 4, label: '下午', range: [14, 18] },
    { id: 5, label: '傍晚', range: [18, 21] },
    { id: 6, label: '晚上', range: [21, 24] }
  ];

  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    return rec && rec.days ? rec : { days: {} };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function fmtHM(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function fmtGap(ms) {
    if (!ms || ms <= 0) return '';
    const m = Math.round(ms / 60000);
    if (m < 60) return m + ' 分钟';
    return Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分';
  }
  function slotOf(hour) {
    for (const s of SLOTS) if (hour >= s.range[0] && hour < s.range[1]) return s.id;
    return 0;
  }
  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysAgoDate(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  XU.regPanel('smoke', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    const today = XU.today();

    function todayList() {
      return (data.days[today] || []).slice().sort((a, b) => a - b);
    }
    function totalCount() {
      let n = 0;
      Object.keys(data.days).forEach((k) => { n += data.days[k].length; });
      return n;
    }
    function statsOf(list) {
      if (list.length < 2) return { first: list[0] || null, last: list[list.length - 1] || null, avg: 0, lastGap: 0, gaps: [] };
      const gaps = [];
      for (let i = 1; i < list.length; i++) gaps.push(list[i] - list[i - 1]);
      const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      return { first: list[0], last: list[list.length - 1], avg, lastGap: gaps[gaps.length - 1], gaps };
    }
    function slotCounts(daysBack) {
      const counts = SLOTS.map(() => 0);
      for (let i = 0; i <= daysBack; i++) {
        const k = dateKey(daysAgoDate(i));
        (data.days[k] || []).forEach((ts) => {
          const h = new Date(ts).getHours();
          counts[slotOf(h)]++;
        });
      }
      return counts;
    }
    function recentDaily(daysBack) {
      const out = [];
      for (let i = daysBack - 1; i >= 0; i--) {
        const d = daysAgoDate(i);
        const k = dateKey(d);
        out.push({ k, n: (data.days[k] || []).length, label: i === 0 ? '今' : String(d.getDate()) });
      }
      return out;
    }

    function statCard(emoji, num, lab) {
      return '<div class="stat-card"><div class="ico">' + emoji + '</div><div class="num">' + num + '</div><div class="lab">' + lab + '</div></div>';
    }

    function renderToday() {
      const list = todayList();
      const st = statsOf(list);
      const info = XU.$('#smokeInfo', el);
      info.innerHTML =
        '<div class="smoke-mini"><span>第一根</span><b>' + (st.first ? fmtHM(st.first) : '—') + '</b></div>' +
        '<div class="smoke-mini"><span>最后一根</span><b>' + (st.last ? fmtHM(st.last) : '—') + '</b></div>' +
        '<div class="smoke-mini"><span>平均间隔</span><b>' + (st.avg ? fmtGap(st.avg) : '—') + '</b></div>' +
        '<div class="smoke-mini"><span>上次间隔</span><b>' + (st.lastGap ? fmtGap(st.lastGap) : '—') + '</b></div>';

      const listEl = XU.$('#smokeTodayList', el);
      listEl.innerHTML = list.length
        ? list.map((ts, i) => {
            const gap = i > 0 ? fmtGap(ts - list[i - 1]) : '';
            return '<div class="row-item">' +
              '<div style="width:40px;height:40px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:18px;flex:0 0 auto">🚬</div>' +
              '<div class="grow"><div class="title" style="font-weight:800">' + fmtHM(ts) + '</div>' +
              '<div class="desc">' + (i === 0 ? '今天第一根' : '距上一根 ' + gap) + '</div></div>' +
              '<button class="btn mini danger" data-del="' + i + '">' + XU.icon('trash') + '</button>' +
            '</div>';
          }).join('')
        : '<div class="empty">今天还没记录，抽了就来点一下 🚬</div>';

      XU.$('#smokeToday', el).textContent = list.length;
      XU.$('#smokeTotal', el).textContent = totalCount();
    }

    function renderWeek() {
      const days = recentDaily(7);
      const max = Math.max(1, Math.max.apply(null, days.map((d) => d.n)));
      XU.$('#smokeWeek', el).innerHTML =
        '<div class="smoke-week-bars">' +
        days.map((d) =>
          '<div class="smoke-day"><div class="smoke-bar-wrap"><div class="smoke-bar" style="height:' + Math.max(4, Math.round((d.n / max) * 56)) + 'px"></div></div>' +
          '<div class="smoke-cnt">' + (d.n || '') + '</div><div class="smoke-wd">' + d.label + '</div></div>'
        ).join('') + '</div>';
    }

    function renderSlots() {
      const daysBack = XU.$('#slotRange', el).getAttribute('data-r') === '30' ? 30 : 7;
      const counts = slotCounts(daysBack);
      const max = Math.max(1, Math.max.apply(null, counts));
      const total = counts.reduce((s, n) => s + n, 0);
      const bestIdx = counts.indexOf(Math.max.apply(null, counts));
      const box = XU.$('#slotBox', el);
      box.innerHTML = counts.map((n, i) =>
        '<div class="smoke-row">' +
          '<span class="smoke-slot">' + SLOTS[i].label + '</span>' +
          '<div class="smoke-track"><i style="width:' + Math.round((n / max) * 100) + '%' + (n ? '' : ';opacity:.25') + '"></i></div>' +
          '<span class="smoke-num">' + n + '</span>' +
        '</div>').join('') +
        '<p class="sub" style="margin-top:10px">近 ' + (daysBack === 30 ? '30' : '7') + ' 天共 ' + total + ' 根' +
        (total ? ' · 你在<b style="color:var(--warn)"> ' + SLOTS[bestIdx].label + '</b> 时段抽得最多' : '') + '</p>';
    }

    function renderGaps() {
      const list = todayList();
      const st = statsOf(list);
      const box = XU.$('#gapBox', el);
      if (st.gaps.length < 1) {
        box.innerHTML = '<div class="empty">今天至少记 2 根后，这里会显示间隔分析</div>';
        return;
      }
      const recent = st.gaps.slice(-6).reverse();
      box.innerHTML = recent.map((g, i) => {
        const idx = st.gaps.length - i - 1;
        return '<div class="row-item" style="padding:10px 12px">' +
          '<div class="grow"><div class="title" style="font-size:13.5px">第 ' + (idx + 1) + ' 次间隔</div>' +
          '<div class="desc">' + fmtHM(list[idx]) + ' → ' + fmtHM(list[idx + 1]) + '</div></div>' +
          '<b style="color:var(--primary)">' + fmtGap(g) + '</b></div>';
      }).join('') +
      '<p class="sub" style="margin-top:8px">平均 ' + fmtGap(st.avg) + ' · 最长 ' + fmtGap(Math.max.apply(null, st.gaps)) + ' · 最短 ' + fmtGap(Math.min.apply(null, st.gaps)) + '</p>';
    }

    el.innerHTML =
      '<div class="card">' +
        '<h2>🚬 抽烟记录</h2>' +
        '<p class="sub">抽一根，记一根 · 看清自己的抽烟节奏</p>' +
        '<button class="btn smoke-add" id="smokeAdd">🚬 记录一根（现在）</button>' +
        '<button class="btn ghost" id="smokeBackfill" style="width:100%;margin-top:8px">⏪ 补记刚才 / 以前的</button>' +
        '<div class="grid2" style="margin-top:14px">' +
          statCard('🚬', '<span id="smokeToday">0</span>', '今日根数') +
          statCard('📦', '<span id="smokeTotal">0</span>', '累计根数') +
        '</div>' +
        '<div class="smoke-info" id="smokeInfo"></div>' +
        '<div class="list" id="smokeTodayList"></div>' +
      '</div>' +
      '<div class="card">' +
        '<h2>📅 最近 7 天</h2>' +
        '<div class="smoke-week-bars" id="smokeWeek"></div>' +
      '</div>' +
      '<div class="card">' +
        '<h2>⏰ 什么时候抽得多</h2>' +
        '<div class="seg" id="slotRange" data-r="30">' +
          '<button data-r="7">近 7 天</button><button data-r="30" class="on">近 30 天</button>' +
        '</div>' +
        '<div id="slotBox"></div>' +
      '</div>' +
      '<div class="card">' +
        '<h2>⏱️ 间隔分析（今日）</h2>' +
        '<div id="gapBox"></div>' +
      '</div>' +
      '<p class="sub" style="text-align:center;margin:12px 0 4px">🚬 吸烟有害健康 · 记录是为了逐渐掌控，而不是放纵</p>';

    renderToday(); renderWeek(); renderSlots(); renderGaps();

    XU.$('#smokeAdd', el).onclick = async () => {
      const ts = Date.now();
      const k = dateKey(new Date(ts));
      if (!data.days[k]) data.days[k] = [];
      data.days[k].push(ts);
      await saveData(data);
      renderToday(); renderWeek(); renderSlots(); renderGaps();
      XU.toast('已记录 🚬 ' + fmtHM(ts));
    };

    XU.$('#smokeTodayList', el).addEventListener('click', async (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const idx = parseInt(del.getAttribute('data-del'), 10);
      const list = todayList();
      const ts = list[idx];
      XU.confirm('删除 ' + fmtHM(ts) + ' 这条记录？', async () => {
        data.days[today] = data.days[today].filter((t) => t !== ts);
        if (!data.days[today].length) delete data.days[today];
        await saveData(data);
        renderToday(); renderWeek(); renderSlots(); renderGaps();
      }, true);
    });

    XU.$('#smokeBackfill', el).onclick = () => {
      const now = new Date();
      XU.modal(
        '<h3>⏪ 补记</h3>' +
        '<label class="lbl">日期</label><input type="date" id="sDate" value="' + today + '">' +
        '<label class="lbl">时间</label><input type="time" id="sTime" value="' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + '">' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
        { onMount: (mask, close) => {
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const dv = XU.$('#sDate', mask).value;
            const tv = XU.$('#sTime', mask).value;
            if (!dv || !tv) { XU.toast('请选择日期和时间'); return; }
            const ts = new Date(dv + 'T' + tv + ':00').getTime();
            if (isNaN(ts)) { XU.toast('时间格式不正确'); return; }
            if (!data.days[dv]) data.days[dv] = [];
            data.days[dv].push(ts);
            await saveData(data);
            close(); renderToday(); renderWeek(); renderSlots(); renderGaps();
            XU.toast('已补记 ' + dv + ' ' + tv);
          };
        } }
      );
    };

    XU.$('#slotRange', el).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      XU.$('#slotRange', el).setAttribute('data-r', b.getAttribute('data-r'));
      XU.$$('#slotRange button', el).forEach((x) => x.classList.toggle('on', x === b));
      renderSlots();
    });
  });
})();
