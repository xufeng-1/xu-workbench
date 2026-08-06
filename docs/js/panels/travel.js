/* panels/travel.js —— 旅游：全国目的地一键生成简介 + 按天行程 + 住宿/美食/游玩推荐 */
(function () {
  const XU = window.XU;
  const KEY = 'travel';
  const TAG_EMOJI = { '都市': '🏙️', '古镇': '🏘️', '自然': '🏔️', '海滨': '🏖️', '人文': '🏛️', '园林': '🌸', '美食': '🍜', '乡村': '🌾', '高原': '⛰️', '热带': '🌴', '冰雪': '❄️', '草原': '🌿' };

  function esc(s) { return XU.esc(s); }

  /* 自动生成按天行程：首日抵达、中间日按打卡点分配、末日采购返程 */
  function buildPlan(name, info, daysN) {
    const spots = (info.spots || []).slice();
    const plan = [];
    plan.push('抵达' + name + ' → 入住（' + (info.hotels[0] || '市中心') + '）→ 晚上尝当地特色：' + (info.foods[0] || '特色美食'));
    if (daysN <= 1) {
      plan.push((spots.slice(0, 4).map((s) => s[0]).join(' → ') || '市区漫步') + ' → 返程');
      return plan;
    }
    const mid = daysN - 2;
    const perDay = Math.max(2, Math.ceil(spots.length / Math.max(1, mid)));
    let idx = 0;
    for (let d = 0; d < mid; d++) {
      const chunk = spots.slice(idx, idx + perDay);
      idx += perDay;
      plan.push(chunk.length ? chunk.map((s) => s[0]).join(' → ') : '自由活动：睡到自然醒，逛咖啡馆/书店');
    }
    plan.push('补漏打卡 + 采购伴手礼（' + (info.foods.slice(2, 4).join('、') || '当地特产') + '等）→ 返程');
    return plan;
  }

  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    return rec || { history: [] };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  XU.regPanel('travel', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    let TD = { regions: [], dests: {} };
    try { TD = await XU.feed('travelDest'); } catch (e) { /* 离线时降级为空数据 */ }
    const REGIONS = TD.regions || [];
    const D = TD.dests || {};

    const data = await getData();
    let days = 3;
    let region = 'all';

    function infoOf(name) { return D[name] || null; }

    function renderPlan(name) {
      const info = infoOf(name);
      const box = XU.$('#travelOut', el);
      if (!info) {
        box.innerHTML = '<div class="card"><div class="empty">暂未收录该目的地，试试下方推荐清单，或换个城市名～</div></div>';
        return;
      }
      const plan = buildPlan(name, info, days);
      box.innerHTML =
        '<div class="card">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">' +
            '<h2>📍 ' + esc(name) + ' · ' + days + ' 天行程</h2>' +
            '<button class="btn mini ghost" id="tCopy">' + XU.icon('copy') + ' 复制</button>' +
          '</div>' +
          '<p class="sub" style="white-space:pre-line">' + esc(info.intro) + '</p>' +
          '<div class="chip" style="background:var(--card-tint)">🌤️ ' + esc(info.season) + '</div>' +
        '</div>' +
        '<div class="card"><h2>🏨 住宿推荐</h2>' +
          '<div class="list">' + info.hotels.map((h) => '<div class="row-item"><div style="width:38px;height:38px;border-radius:11px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto">🏨</div><div class="grow"><div class="title">' + esc(h) + '</div></div></div>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🍜 美食推荐</h2>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' + info.foods.map((f) => '<span class="chip">' + esc(f) + '</span>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🎡 打卡点推荐</h2>' +
          '<div class="list">' + info.spots.map((s) =>
            '<div class="row-item"><div style="width:38px;height:38px;border-radius:11px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto">🎡</div>' +
            '<div class="grow"><div class="title">' + esc(s[0]) + ' <span class="chip" style="font-size:11px">' + esc(s[1]) + '</span></div><div class="desc">' + esc(s[2]) + '</div></div></div>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🗓️ 每日行程</h2><div class="steps">' +
          plan.map((day, i) =>
            '<div class="step"><div style="flex:1"><div class="title" style="font-weight:800;color:var(--primary)">第 ' + (i + 1) + ' 天</div>' +
            '<div class="desc">' + esc(day) + '</div></div></div>').join('') +
        '</div></div>' +
        '<button class="btn ghost" style="width:100%" id="tSave">⭐ 收藏这份行程</button>';

      XU.$('#tCopy', box).onclick = () => {
        const lines = ['【' + name + ' ' + days + ' 天行程】', info.intro, '',
          '住宿：', info.hotels.map((h) => '· ' + h).join('\n'), '',
          '美食：', info.foods.map((f) => '· ' + f).join('\n'), '',
          '打卡点：', info.spots.map((s) => '· ' + s[0] + '（' + s[2] + '）').join('\n'), '',
          '每日行程：', plan.map((d2, i) => 'Day' + (i + 1) + '：' + d2).join('\n')];
        const text = lines.join('\n');
        XU.copyText ? XU.copyText(text) : navigator.clipboard && navigator.clipboard.writeText(text);
        XU.toast('行程已复制 ✅');
      };
      XU.$('#tSave', box).onclick = async () => {
        data.history = data.history.filter((h) => !(h.name === name && h.days === days));
        data.history.unshift({ name: name, days: days, time: XU.now() });
        data.history = data.history.slice(0, 30);
        await saveData(data);
        renderHistory();
        XU.toast('已收藏到「我的行程」⭐');
      };
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderDestGrid() {
      const box = XU.$('#destGrid', el);
      const names = Object.keys(D).filter((n) => region === 'all' || D[n].reg === region);
      box.innerHTML = names.map((n) => {
        const d = D[n];
        const emoji = TAG_EMOJI[d.tag] || '📍';
        return '<button class="dest-pick" data-dest="' + esc(n) + '">' +
          '<b>' + emoji + ' ' + esc(n) + '</b><i>' + esc(d.tag || '') + ' · ' + esc(d.season.split('；')[0] || '') + '</i></button>';
      }).join('') || '<div class="empty">该区域暂无收录，稍后再看～</div>';
    }

    function renderHistory() {
      const box = XU.$('#travelHis', el);
      box.innerHTML = data.history.length
        ? data.history.map((h, i) =>
            '<div class="row-item"><div style="width:40px;height:40px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:18px;flex:0 0 auto">🧳</div>' +
            '<div class="grow"><div class="title" style="font-weight:800">' + esc(h.name) + ' · ' + h.days + ' 天</div><div class="vd">收藏于 ' + esc(h.time || '') + '</div></div>' +
            '<button class="btn mini" data-load="' + i + '">查看</button>' +
            '<button class="btn mini danger" data-del="' + i + '">' + XU.icon('trash') + '</button></div>').join('')
        : '<div class="empty">收藏的行程会出现在这里，方便下次直接查看</div>';
    }

    el.innerHTML =
      '<div class="hero">' +
        '<h2 style="color:#fff;margin:0 0 4px">🧳 旅游规划</h2>' +
        '<p style="margin:0;font-size:12.5px;opacity:.92">收录全国 ' + Object.keys(D).length + ' 个经典目的地，一键生成行程与美食/住宿/打卡推荐</p>' +
      '</div>' +
      '<div class="card">' +
        '<label class="lbl">想去哪里？</label>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="search" id="tName" placeholder="例如：北京、拉萨、敦煌…" style="flex:1">' +
          '<button class="btn" id="tGo">生成</button>' +
        '</div>' +
        '<div class="tabs" id="regTabs" style="margin:12px 0 8px">' +
          '<button class="tab active" data-r="all">全部</button>' +
          REGIONS.map((r) => '<button class="tab" data-r="' + r.id + '">' + r.label + '</button>').join('') +
        '</div>' +
        '<div class="dest-grid" id="destGrid"></div>' +
        '<label class="lbl" style="margin-top:14px">行程天数</label>' +
        '<div class="seg" id="tDays">' +
          [3, 5, 7].map((n) => '<button data-n="' + n + '"' + (n === days ? ' class="on"' : '') + '>' + n + ' 天</button>').join('') +
        '</div>' +
      '</div>' +
      '<div id="travelOut"></div>' +
      '<div class="card"><h2>🧳 我的行程</h2><p class="sub">收藏过的规划，随时回看</p><div class="list" id="travelHis"></div></div>';

    renderDestGrid(); renderHistory();

    XU.$('#tGo', el).onclick = () => {
      const name = XU.$('#tName', el).value.trim();
      if (!name) { XU.toast('先输入一个目的地～'); return; }
      renderPlan(name);
    };
    XU.$('#tName', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') XU.$('#tGo', el).click(); });

    XU.$('#regTabs', el).addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      region = b.getAttribute('data-r');
      XU.$$('#regTabs .tab', el).forEach((x) => x.classList.toggle('active', x === b));
      renderDestGrid();
    });

    XU.$('#tDays', el).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      days = parseInt(b.getAttribute('data-n'), 10);
      XU.$$('#tDays button', el).forEach((x) => x.classList.toggle('on', x === b));
      const cur = XU.$('#travelOut .card h2', el);
      if (cur) {
        const m = /📍 (.+) · (\d+) 天行程/.exec(cur.textContent);
        if (m) renderPlan(m[1]);
      }
    });

    el.addEventListener('click', (e) => {
      const dest = e.target.closest('[data-dest]');
      if (dest) { renderPlan(dest.getAttribute('data-dest')); return; }
      const load = e.target.closest('[data-load]');
      if (load) {
        const h = data.history[parseInt(load.getAttribute('data-load'), 10)];
        if (h) {
          XU.$('#tName', el).value = h.name;
          days = h.days;
          XU.$$('#tDays button', el).forEach((x) => x.classList.toggle('on', String(x.getAttribute('data-n')) === String(h.days)));
          renderPlan(h.name);
        }
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        const i = parseInt(del.getAttribute('data-del'), 10);
        XU.confirm('删除这条收藏？', async () => {
          data.history.splice(i, 1);
          await saveData(data);
          renderHistory();
        }, true);
      }
    });
  });
})();