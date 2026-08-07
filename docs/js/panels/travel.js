/* panels/travel.js —— 旅游：全国目的地（含小众）一键生成行程 + 酒店/美食/打卡详情 */
(function () {
  const XU = window.XU;
  const KEY = 'travel';
  const TAG_EMOJI = { '都市': '🏙️', '古镇': '🏘️', '自然': '🏔️', '海滨': '🏖️', '人文': '🏛️', '园林': '🌸', '美食': '🍜', '乡村': '🌾', '高原': '⛰️', '热带': '🌴', '冰雪': '❄️', '草原': '🌿', '民族': '🪘' };

  function esc(s) { return XU.esc(s); }
  function amap(kw, city) { return 'https://uri.amap.com/search?keyword=' + encodeURIComponent(kw) + '&city=' + encodeURIComponent(city || ''); }

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
    try { TD = await XU.feed('travelDest'); } catch (e) { /* 离线降级为空数据 */ }
    const REGIONS = TD.regions || [];
    const D = TD.dests || {};

    const data = await getData();
    let days = 3;
    let region = 'all';

    /* 搜索兜底：未收录的小地方也能生成通用方案 */
    function infoOf(name) {
      if (D[name]) return D[name];
      const fuzzy = Object.keys(D).find((k) => name.indexOf(k) >= 0 || k.indexOf(name) >= 0);
      if (fuzzy) return D[fuzzy];
      return {
        generic: true,
        tag: '小众',
        intro: '「' + name + '」属于小众目的地，当前展示的是自动生成的通用方案：玩法、酒店与美食请以高德地图实况为准，建议先用地图搜索确认。',
        season: '全年均可（旺季节假日人流大）',
        hotels: [{ name: name + '城区酒店', addr: name + '市中心/商圈', price: '约 150-400 元/晚', desc: '本地住宿参考，点开地图查看周边酒店、实价与评价。', map: amap(name + '酒店', name) }],
        foods: [{ name: '当地特色菜', shop: name + '本地风味馆', addr: name + '老城区', desc: '本地口碑餐厅参考，点开地图查看评价与照片。', map: amap(name + '美食', name) }],
        spots: [{ name: name + '城市地标', tag: '地标', desc: '当地代表性打卡点，点开地图查看位置与照片。', map: amap(name + '景点', name) }]
      };
    }

    function buildPlan(name, info, daysN) {
      const spots = (info.spots || []).slice();
      const plan = [];
      plan.push('抵达' + name + ' → 入住（' + (info.hotels[0] ? info.hotels[0].name : '市中心') + '）→ 晚上尝当地特色：' + (info.foods[0] ? info.foods[0].name : '特色美食'));
      if (daysN <= 1) {
        plan.push((spots.slice(0, 4).map((s) => s.name).join(' → ') || '市区漫步') + ' → 返程');
        return plan;
      }
      const mid = daysN - 2;
      const perDay = Math.max(2, Math.ceil(spots.length / Math.max(1, mid)));
      let idx = 0;
      for (let d = 0; d < mid; d++) {
        const chunk = spots.slice(idx, idx + perDay);
        idx += perDay;
        plan.push(chunk.length ? chunk.map((s) => s.name).join(' → ') : '自由活动：睡到自然醒，逛咖啡馆/书店');
      }
      plan.push('补漏打卡 + 采购伴手礼（' + (info.foods.slice(2, 4).map((f) => f.name).join('、') || '当地特产') + '等）→ 返程');
      return plan;
    }

    function detailModal(title, rows, mapUrl) {
      XU.modal(
        '<h3>' + esc(title) + '</h3>' +
        '<div class="list">' + rows.map((r) =>
          '<div class="row-item" style="align-items:flex-start"><div style="width:34px;height:34px;border-radius:10px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:15px;flex:0 0 auto">' + r.ico + '</div>' +
          '<div class="grow"><div class="desc" style="font-size:13.5px"><b>' + esc(r.k) + '</b>：' + esc(r.v) + '</div></div></div>').join('') +
        '</div>' +
        (mapUrl ? '<div class="actions"><button class="btn" id="dMap" style="flex:1">🗺️ 打开地图看照片/评价</button><button class="btn ghost" data-x="no">关闭</button></div>' : '<div class="actions"><button class="btn ghost" data-x="no" style="flex:1">关闭</button></div>'),
        { onMount: (mask, close) => {
          const m = XU.$('#dMap', mask);
          if (m) m.onclick = () => { XU.openUrl(mapUrl); close(); };
          const no = XU.$('[data-x=no]', mask);
          if (no) no.onclick = close;
        } }
      );
    }

    function openHotel(info, i) {
      const h = info.hotels[i];
      if (!h) return;
      detailModal('🏨 ' + h.name, [
        { ico: '📍', k: '地址', v: h.addr },
        { ico: '💰', k: '参考价', v: h.price },
        { ico: '📝', k: '介绍', v: h.desc }
      ], h.map);
    }
    function openFood(info, i) {
      const f = info.foods[i];
      if (!f) return;
      detailModal('🍜 ' + f.name, [
        { ico: '🏪', k: '推荐店', v: f.shop },
        { ico: '📍', k: '地址', v: f.addr },
        { ico: '📝', k: '介绍', v: f.desc }
      ], f.map);
    }
    function openSpot(info, i) {
      const s = info.spots[i];
      if (!s) return;
      detailModal('🎡 ' + s.name, [
        { ico: '🏷️', k: '类型', v: s.tag },
        { ico: '📝', k: '介绍', v: s.desc }
      ], s.map);
    }

    function renderPlan(name) {
      const info = infoOf(name);
      const box = XU.$('#travelOut', el);
      const plan = buildPlan(name, info, days);
      box.innerHTML =
        '<div class="card">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">' +
            '<h2>📍 ' + esc(name) + ' · ' + days + ' 天行程</h2>' +
            '<button class="btn mini ghost" id="tCopy">' + XU.icon('copy') + ' 复制</button>' +
          '</div>' +
          (info.generic ? '<p class="sub" style="color:var(--warn);font-weight:700">✨ 小众目的地 · 自动生成通用方案，请以地图实况为准</p>' : '') +
          '<p class="sub" style="white-space:pre-line">' + esc(info.intro) + '</p>' +
          '<div class="chip" style="background:var(--card-tint)">🌤️ ' + esc(info.season) + '</div>' +
        '</div>' +
        '<div class="card"><h2>🏨 住宿推荐 <span style="font-size:11px;color:var(--muted)">点名称看详情</span></h2>' +
          '<div class="list">' + info.hotels.map((h, i) =>
            '<button class="row-item" data-hotel="' + i + '" style="width:100%;text-align:left;border:none;background:transparent;cursor:pointer;padding:8px 0">' +
            '<div style="width:38px;height:38px;border-radius:11px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto">🏨</div>' +
            '<div class="grow"><div class="title">' + esc(h.name) + '</div><div class="vd">' + esc(h.price || '') + ' · ' + esc(h.addr || '') + '</div></div>' +
            '<span style="color:var(--primary);font-size:12px">详情 ›</span></button>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🍜 美食推荐 <span style="font-size:11px;color:var(--muted)">点美食看店名地址</span></h2>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' + info.foods.map((f, i) =>
            '<button class="chip" data-food="' + i + '" style="border:none;cursor:pointer;background:var(--primary-soft);color:var(--primary)">' + esc(f.name) + '</button>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🎡 打卡点推荐 <span style="font-size:11px;color:var(--muted)">点名称看详情</span></h2>' +
          '<div class="list">' + info.spots.map((s, i) =>
            '<button class="row-item" data-spot="' + i + '" style="width:100%;text-align:left;border:none;background:transparent;cursor:pointer;padding:8px 0">' +
            '<div style="width:38px;height:38px;border-radius:11px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto">🎡</div>' +
            '<div class="grow"><div class="title">' + esc(s.name) + ' <span class="chip" style="font-size:11px">' + esc(s.tag || '') + '</span></div><div class="desc">' + esc(s.desc || '') + '</div></div>' +
            '<span style="color:var(--primary);font-size:12px">详情 ›</span></button>').join('') + '</div>' +
        '</div>' +
        '<div class="card"><h2>🗓️ 每日行程</h2><div class="steps">' +
          plan.map((day, i) =>
            '<div class="step"><div style="flex:1"><div class="title" style="font-weight:800;color:var(--primary)">第 ' + (i + 1) + ' 天</div>' +
            '<div class="desc">' + esc(day) + '</div></div></div>').join('') +
        '</div></div>' +
        '<button class="btn ghost" style="width:100%" id="tSave">⭐ 收藏这份行程</button>';

      XU.$('#tCopy', box).onclick = () => {
        const lines = ['【' + name + ' ' + days + ' 天行程】', info.intro, '',
          '住宿：', info.hotels.map((h) => '· ' + h.name + '（' + (h.price || '') + '）').join('\n'), '',
          '美食：', info.foods.map((f) => '· ' + f.name + '（' + f.shop + '）').join('\n'), '',
          '打卡点：', info.spots.map((s) => '· ' + s.name + '（' + (s.desc || '') + '）').join('\n'), '',
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
          '<b>' + emoji + ' ' + esc(n) + '</b><i>' + esc(d.tag || '') + ' · ' + esc((d.season || '').split('；')[0] || '') + '</i></button>';
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
        '<p style="margin:0;font-size:12.5px;opacity:.92">收录全国 ' + Object.keys(D).length + ' 个目的地（含小众）· 搜不到的也能自动生成方案</p>' +
      '</div>' +
      '<div class="card">' +
        '<label class="lbl">想去哪里？</label>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="search" id="tName" placeholder="例如：北京、漠河、稻城亚丁…" style="flex:1">' +
          '<button class="btn" id="tGo">生成</button>' +
        '</div>' +
        '<div class="wrap-tabs" id="regTabs" style="margin:12px 0 8px">' +
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
      const hotel = e.target.closest('[data-hotel]');
      if (hotel) { const m = /📍 (.+) · (\d+) 天行程/.exec(XU.$('#travelOut .card h2', el) ? XU.$('#travelOut .card h2', el).textContent : ''); if (m) openHotel(infoOf(m[1]), parseInt(hotel.getAttribute('data-hotel'), 10)); return; }
      const food = e.target.closest('[data-food]');
      if (food) { const m = /📍 (.+) · (\d+) 天行程/.exec(XU.$('#travelOut .card h2', el) ? XU.$('#travelOut .card h2', el).textContent : ''); if (m) openFood(infoOf(m[1]), parseInt(food.getAttribute('data-food'), 10)); return; }
      const spot = e.target.closest('[data-spot]');
      if (spot) { const m = /📍 (.+) · (\d+) 天行程/.exec(XU.$('#travelOut .card h2', el) ? XU.$('#travelOut .card h2', el).textContent : ''); if (m) openSpot(infoOf(m[1]), parseInt(spot.getAttribute('data-spot'), 10)); return; }
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