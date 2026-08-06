/* panels/period.js —— 生理期：经期记录 + 周期预测 + 日历 + 症状打卡（数据仅本机） */
(function () {
  const XU = window.XU;
  const KEY = 'period';
  const FLOWS = [
    { v: 0, label: '无' },
    { v: 1, label: '少量' },
    { v: 2, label: '中量' },
    { v: 3, label: '大量' }
  ];
  const SYMPTOMS = ['痛经', '腰酸', '疲劳', '情绪波动', '头晕', '腹胀', '没症状'];

  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    return rec || { lastStart: null, cycle: 28, periodLen: 5, logs: {} };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function parseD(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function fmt(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function dayDiff(a, b) { return Math.round((b - a) / 86400000); }

  /* 周期区间：以 lastStart 为锚，按 cycle 推导前后 4 个周期 */
  function periodRanges(data) {
    const out = [];
    if (!data.lastStart) return out;
    const anchor = parseD(data.lastStart);
    for (let k = -4; k <= 4; k++) {
      const s = addDays(anchor, k * data.cycle);
      out.push({ s: s, e: addDays(s, data.periodLen - 1) });
    }
    return out;
  }
  function ovulationWindows(data) {
    const out = [];
    if (!data.lastStart) return out;
    const ranges = periodRanges(data);
    for (const r of ranges) {
      const ov = addDays(r.s, data.cycle - 14);
      out.push({ s: addDays(ov, -4), e: addDays(ov, 3), day: ov });
    }
    return out;
  }
  function todayStatus(data) {
    if (!data.lastStart) return null;
    const today = new Date();
    const todayStr = fmt(today);
    const ranges = periodRanges(data);
    const ovs = ovulationWindows(data);
    const inRange = ranges.find((r) => todayStr >= fmt(r.s) && todayStr <= fmt(r.e));
    if (inRange) {
      const day = dayDiff(inRange.s, today) + 1;
      return { kind: 'period', day: day, next: fmt(addDays(inRange.s, data.cycle)), ovDay: fmt(addDays(inRange.s, data.cycle - 14)) };
    }
    const inOv = ovs.find((o) => todayStr >= fmt(o.s) && todayStr <= fmt(o.e));
    if (inOv) {
      return { kind: 'ovulation', next: fmt(addDays(parseD(data.lastStart), Math.ceil((dayDiff(parseD(data.lastStart), today) + 1) / data.cycle) * data.cycle)), ovDay: fmt(inOv.day) };
    }
    const nextStart = ranges.find((r) => fmt(r.s) > todayStr);
    const gap = nextStart ? dayDiff(today, nextStart.s) : null;
    return { kind: 'safe', next: nextStart ? fmt(nextStart.s) : '', gap: gap };
  }

  XU.regPanel('period', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();

    function renderStatus() {
      const st = todayStatus(data);
      const box = XU.$('#periodStatus', el);
      if (!st) {
        box.innerHTML = '<div class="empty">还没有设置周期，请在下方填写「最近一次经期开始」日期</div>';
        return;
      }
      let html = '';
      if (st.kind === 'period') {
        html = '<div class="period-badge" style="background:#FBE3E3;color:#C2384A">经期第 ' + st.day + ' 天</div>' +
          '<p class="sub">预测下次经期：' + st.next + '</p>';
      } else if (st.kind === 'ovulation') {
        html = '<div class="period-badge" style="background:#FDF3E3;color:#C96A1F">排卵期 · 易孕期</div>' +
          '<p class="sub">预测排卵日：' + st.ovDay + ' · 如需备孕/避孕请结合排卵试纸</p>';
      } else {
        html = '<div class="period-badge" style="background:var(--primary-soft);color:var(--primary)">安全期</div>' +
          '<p class="sub">距下次经期还有 ' + st.gap + ' 天（预测 ' + st.next + '）</p>';
      }
      box.innerHTML = html + '<p class="sub" style="margin-top:6px">🔒 所有数据只保存在你的手机本地</p>';
    }

    function renderCalendar() {
      const grid = XU.$('#periodCal', el);
      XU.$('#calTitle', el).textContent = viewYear + ' 年 ' + (viewMonth + 1) + ' 月';
      const first = new Date(viewYear, viewMonth, 1);
      const startPad = first.getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const todayStr = fmt(today);
      const ranges = periodRanges(data);
      const ovs = ovulationWindows(data);
      const cells = [];
      for (let i = 0; i < startPad; i++) cells.push('<div class="cal-cell empty"></div>');
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(viewYear, viewMonth, d);
        const ds = fmt(dt);
        let cls = 'cal-cell';
        let dot = '';
        const inRange = ranges.some((r) => ds >= fmt(r.s) && ds <= fmt(r.e));
        const inOv = ovs.some((o) => ds >= fmt(o.s) && ds <= fmt(o.e));
        if (inRange) cls += ' period';
        else if (inOv) cls += ' ov';
        if (ds === todayStr) cls += ' now';
        if (data.logs[ds]) dot = '<i class="cal-dot' + (data.logs[ds].flow > 1 ? ' heavy' : '') + '"></i>';
        cells.push('<div class="' + cls + '" data-day="' + ds + '">' + d + dot + '</div>');
      }
      grid.innerHTML = cells.join('');
    }

    function renderLogs() {
      const box = XU.$('#periodLogs', el);
      const keys = Object.keys(data.logs).sort().reverse();
      box.innerHTML = keys.length
        ? keys.map((k) => {
            const l = data.logs[k];
            const flow = FLOWS.find((f) => f.v === l.flow);
            return '<div class="row-item">' +
              '<div style="width:40px;height:40px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:16px;flex:0 0 auto">🩸</div>' +
              '<div class="grow"><div class="title">' + k + '</div>' +
              '<div class="desc">流量：' + (flow ? flow.label : '—') + (l.symptoms && l.symptoms.length ? ' · ' + l.symptoms.join('、') : '') + '</div></div>' +
              '<button class="btn mini danger" data-del="' + k + '">' + XU.icon('trash') + '</button>' +
            '</div>';
          }).join('')
        : '<div class="empty">还没有症状记录，点击日历中的某一天即可记录</div>';
    }

    el.innerHTML =
      '<div class="card">' +
        '<h2>🌸 生理期</h2>' +
        '<p class="sub">周期记录 · 排卵预测 · 每日症状 · 数据仅存本机</p>' +
        '<div id="periodStatus"></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin:14px 0 8px">' +
          '<button class="btn mini ghost" id="calPrev">‹</button>' +
          '<b id="calTitle"></b>' +
          '<button class="btn mini ghost" id="calNext">›</button>' +
        '</div>' +
        '<div class="cal-head">' + ['日', '一', '二', '三', '四', '五', '六'].map((w) => '<span>' + w + '</span>').join('') + '</div>' +
        '<div class="cal-grid" id="periodCal"></div>' +
        '<p class="sub" style="margin-top:8px"><span class="cal-legend" style="background:#FBE3E3;color:#C2384A">经期</span> <span class="cal-legend" style="background:#FDF3E3;color:#C96A1F">排卵期</span> <span class="cal-legend ring">今天</span> <span class="cal-legend"><i class="cal-dot"></i>有记录</span></p>' +
      '</div>' +
      '<div class="card">' +
        '<h2>🩸 症状 / 流量打卡</h2>' +
        '<div class="list" id="periodLogs"></div>' +
      '</div>' +
      '<div class="card">' +
        '<h2>⚙️ 周期设置</h2>' +
        '<label class="lbl">最近一次经期开始日期</label>' +
        '<input type="date" id="pStart" value="' + (data.lastStart || '') + '">' +
        '<label class="lbl">周期天数（两次经期间隔，默认 28）</label>' +
        '<input type="number" id="pCycle" min="20" max="45" value="' + data.cycle + '">' +
        '<label class="lbl">经期天数（默认 5）</label>' +
        '<input type="number" id="pLen" min="2" max="10" value="' + data.periodLen + '">' +
        '<div class="actions"><button class="btn" id="pSave" style="flex:1">保存设置</button></div>' +
      '</div>';

    renderStatus(); renderCalendar(); renderLogs();

    XU.$('#calPrev', el).onclick = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(); };
    XU.$('#calNext', el).onclick = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderCalendar(); };

    XU.$('#pSave', el).onclick = async () => {
      const start = XU.$('#pStart', el).value;
      const cycle = parseInt(XU.$('#pCycle', el).value, 10);
      const plen = parseInt(XU.$('#pLen', el).value, 10);
      if (!start) { XU.toast('请选择最近一次经期开始日期'); return; }
      if (!cycle || cycle < 20 || cycle > 45) { XU.toast('周期天数请在 20-45 之间'); return; }
      if (!plen || plen < 2 || plen > 10) { XU.toast('经期天数请在 2-10 之间'); return; }
      data.lastStart = start; data.cycle = cycle; data.periodLen = plen;
      await saveData(data);
      renderStatus(); renderCalendar();
      XU.toast('设置已保存 🌸');
    };

    XU.$('#periodCal', el).addEventListener('click', async (e) => {
      const cell = e.target.closest('[data-day]');
      if (!cell) return;
      const ds = cell.getAttribute('data-day');
      const rec = data.logs[ds] || { flow: 0, symptoms: [] };
      XU.modal(
        '<h3>🩸 ' + ds + '</h3>' +
        '<label class="lbl">流量</label>' +
        '<div class="seg" id="pFlow">' + FLOWS.map((f) => '<button data-v="' + f.v + '"' + (f.v === rec.flow ? ' class="on"' : '') + '>' + f.label + '</button>').join('') + '</div>' +
        '<label class="lbl">症状（可多选）</label>' +
        '<div class="sym-chips" id="pSyms">' + SYMPTOMS.map((s) => '<button data-s="' + s + '"' + (rec.symptoms.indexOf(s) >= 0 ? ' class="on"' : '') + '>' + s + '</button>').join('') + '</div>' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
        { onMount: (mask, close) => {
          let flow = rec.flow;
          const syms = rec.symptoms.slice();
          XU.$('#pFlow', mask).addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            flow = parseInt(b.getAttribute('data-v'), 10);
            XU.$$('#pFlow button', mask).forEach((x) => x.classList.toggle('on', x === b));
          });
          XU.$('#pSyms', mask).addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            const s = b.getAttribute('data-s');
            const i = syms.indexOf(s);
            if (i >= 0) syms.splice(i, 1); else syms.push(s);
            b.classList.toggle('on', i < 0);
          });
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            if (flow === 0 && !syms.length) { delete data.logs[ds]; }
            else data.logs[ds] = { flow: flow, symptoms: syms };
            await saveData(data);
            close(); renderCalendar(); renderLogs();
            XU.toast('已记录 🩸');
          };
        } }
      );
    });

    XU.$('#periodLogs', el).addEventListener('click', async (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const ds = del.getAttribute('data-del');
      XU.confirm('删除 ' + ds + ' 的记录？', async () => {
        delete data.logs[ds];
        await saveData(data);
        renderCalendar(); renderLogs();
      }, true);
    });
  });
})();
