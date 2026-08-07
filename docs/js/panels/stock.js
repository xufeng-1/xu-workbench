/* panels/stock.js —— 股票复盘 + 行情中心 + 基金估值（快照每日自动更新，支持实时刷新） */
(function () {
  const XU = window.XU;
  const KEY = 'stock';

  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    return rec && rec.trades ? rec : { watch: [], trades: [], prices: {} };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function esc(s) { return XU.esc(s); }
  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function money(n) {
    const v = Math.round(n * 100) / 100;
    return (v < 0 ? '-' : '') + '¥' + Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(n) { return (Math.round(n * 1000) / 10) + '%'; }
  function sgnPct(n) { const r = Math.round(n * 1000) / 10; return (r > 0 ? '+' : '') + r + '%'; }
  function col(n) { return n > 0 ? 'var(--ok)' : (n < 0 ? 'var(--danger)' : 'var(--muted)'); }
  function secidOf(code) { const c = String(code || '').trim(); return /^[69]/.test(c) ? '1.' + c : '0.' + c; }

  /* JSONP 请求：用于浏览器端实时行情（尽力而为，失败静默） */
  function jsonp(url, timeout) {
    return new Promise(function (resolve, reject) {
      const cb = 'xu_cb_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(function () { cleanup(); reject(new Error('timeout')); }, timeout || 8000);
      function cleanup() {
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      window[cb] = function (data) { done = true; cleanup(); resolve(data); };
      script.onerror = function () { if (!done) { done = true; cleanup(); reject(new Error('jsonp error')); } };
      script.src = url.replace('__CB__', cb);
      document.head.appendChild(script);
    });
  }
  function fundLive(code, timeout) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(function () { cleanup(); reject(new Error('timeout')); }, timeout || 8000);
      function cleanup() {
        clearTimeout(timer);
        try { delete window.jsonpgz; } catch (e) { window.jsonpgz = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      window.jsonpgz = function (data) { done = true; cleanup(); resolve(data || {}); };
      script.onerror = function () { if (!done) { done = true; cleanup(); reject(new Error('jsonp error')); } };
      script.src = 'https://fundgz.1234567.com.cn/js/' + encodeURIComponent(String(code)) + '.js?rt=' + Date.now();
      document.head.appendChild(script);
    });
  }

  /* 按时间顺序计算每只股票的持仓与已实现盈亏 */
  function positionsOf(trades) {
    const byCode = {};
    trades.forEach((t) => { (byCode[t.code] = byCode[t.code] || []).push(t); });
    const out = {};
    Object.keys(byCode).forEach((code) => {
      const list = byCode[code].slice().sort((a, b) => (a.date < b.date ? -1 : 1));
      let qty = 0, cost = 0, realized = 0;
      list.forEach((t) => {
        const p = num(t.price), q = num(t.qty);
        if (t.side === 'buy') {
          cost = (cost * qty + p * q) / (qty + q);
          qty += q;
        } else {
          const sellQty = Math.min(q, qty);
          realized += (p - cost) * sellQty;
          qty -= sellQty;
        }
      });
      out[code] = { name: list[0].name, qty: qty, cost: cost, realized: realized };
    });
    return out;
  }

  XU.regPanel('stock', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    let snap = null;
    try { snap = await XU.feed('market'); } catch (e) { snap = null; }
    let live = null;         // 最近一次实时刷新结果
    let liveTime = '';
    let tab = 'hold';
    let sectorKind = 'sectors';
    const fundSearch = (snap && snap.fundSearch) || [];

    function quoteOf(code) {
      if (live && live.stocks && live.stocks[code]) return live.stocks[code];
      if (snap && snap.quotes && snap.quotes[code]) return snap.quotes[code];
      return null;
    }
    function fundQuoteOf(code) {
      if (live && live.funds && live.funds[code]) return live.funds[code];
      if (snap && snap.funds) return snap.funds.find((x) => x.code === code) || null;
      return null;
    }
    function latestPrice(code) {
      const q = quoteOf(code);
      if (q && q.price != null && num(q.price) > 0) return num(q.price);
      const pts = data.prices[code];
      if (pts) {
        const ds = Object.keys(pts).sort();
        if (ds.length) return num(pts[ds[ds.length - 1]]);
      }
      const t = data.trades.filter((x) => x.code === code).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      return t ? num(t.price) : 0;
    }
    function latestPct(code) {
      const q = quoteOf(code);
      return q && q.pct != null ? num(q.pct) : null;
    }

    function sparkline(code) {
      const pts = data.prices[code];
      if (!pts) return '';
      const keys = Object.keys(pts).sort().slice(-14);
      if (keys.length < 2) return '';
      const vals = keys.map((k) => num(pts[k]));
      const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      const range = (max - min) || 1;
      const w = 220, h = 46;
      const ptsStr = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * (w - 8) + 4;
        const y = h - 6 - ((v - min) / range) * (h - 12);
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      const up = vals[vals.length - 1] >= vals[0];
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:48px;display:block">' +
        '<polyline points="' + ptsStr + '" fill="none" stroke="' + (up ? 'var(--ok)' : 'var(--danger)') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="' + ptsStr.split(' ').pop().split(',')[0] + '" cy="' + ptsStr.split(' ').pop().split(',')[1] + '" r="3" fill="' + (up ? 'var(--ok)' : 'var(--danger)') + '"/></svg>';
    }    /* ---------- 自选持仓 ---------- */
    function renderStats() {
      const pos = positionsOf(data.trades);
      const codes = {};
      data.trades.forEach((t) => { codes[t.code] = true; });
      data.watch.forEach((w) => { if (w.type !== 'fund') codes[w.code] = true; });
      let market = 0, costBase = 0, float = 0, realized = 0;
      Object.keys(codes).forEach((code) => {
        const p = pos[code];
        const lp = latestPrice(code);
        if (p && p.qty > 0) {
          costBase += p.cost * p.qty;
          market += lp * p.qty;
          float += (lp - p.cost) * p.qty;
        }
        realized += p ? p.realized : 0;
      });
      const box = XU.$('#stockStats', el);
      box.innerHTML =
        statCard('📈', money(market), '总市值') +
        statCard('🧾', money(costBase), '持仓成本') +
        statCard('📊', money(float), '浮动盈亏') +
        statCard('✅', money(realized), '已实现盈亏');
      const total = float + realized;
      XU.$('#stockTotal', el).textContent = (total >= 0 ? '+' : '') + money(total) + '（' + (total >= 0 ? '赚' : '亏') + '了' + money(Math.abs(total)) + '）';
      return { float: float, realized: realized, total: total, market: market };
    }
    function statCard(emoji, n, lab) {
      return '<div class="stat-card"><div class="ico">' + emoji + '</div><div class="num" style="font-size:16px">' + n + '</div><div class="lab">' + lab + '</div></div>';
    }

    function renderWatch() {
      const box = XU.$('#stockWatch', el);
      const codes = {};
      data.watch.forEach((w) => { if (w.type !== 'fund') codes[w.code] = w.name; });
      data.trades.forEach((t) => { if (!codes[t.code]) codes[t.code] = t.name; });
      const list = Object.keys(codes);
      box.innerHTML = list.length
        ? list.map((code) => {
            const p = positionsOf(data.trades)[code] || { qty: 0, cost: 0, realized: 0 };
            const lp = latestPrice(code);
            const fl = (lp - p.cost) * p.qty;
            const flpct = p.cost && p.qty ? ((lp - p.cost) / p.cost) * 100 : 0;
            const pctv = latestPct(code);
            const q = quoteOf(code);
            return '<div class="card" style="margin-bottom:10px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
                '<div style="display:flex;align-items:center;gap:8px;min-width:0">' +
                  '<div style="width:38px;height:38px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:var(--primary);flex:0 0 auto">' + esc(code) + '</div>' +
                  '<div><div class="title" style="font-weight:800">' + esc(codes[code]) + '</div>' +
                  '<div class="vd">持仓 ' + (p.qty || 0) + ' 股 · 成本 ' + (p.cost ? p.cost.toFixed(3) : '—') + '</div></div>' +
                '</div>' +
                '<div style="text-align:right;flex:0 0 auto">' +
                  '<div class="num" style="font-weight:800;color:' + (fl >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + (fl >= 0 ? '+' : '') + money(fl) + '</div>' +
                  '<div class="vd">' + (pctv != null ? '今日 ' + sgnPct(pctv) : '盈亏 ' + pct(flpct)) + ' · 现价 ' + (q && q.price != null ? q.price.toFixed(2) : (lp || '—')) + '</div>' +
                '</div>' +
              '</div>' +
              sparkline(code) +
              '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
                '<button class="btn mini" data-price="' + esc(code) + '">记收盘价</button>' +
                '<button class="btn mini ghost" data-trade="' + esc(code) + '">记一笔交易</button>' +
                '<button class="btn mini danger" data-delwatch="' + esc(code) + '">移除</button>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<div class="empty">还没有自选股，点下方「添加自选」开始记录</div>';
    }

    function renderTrades() {
      const box = XU.$('#stockTrades', el);
      const list = data.trades.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      box.innerHTML = list.length
        ? list.map((t, i) =>
            '<div class="row-item">' +
              '<div style="width:40px;height:40px;border-radius:12px;background:' + (t.side === 'buy' ? 'var(--primary-soft)' : '#FDE9E9') + ';display:flex;align-items:center;justify-content:center;font-weight:800;color:' + (t.side === 'buy' ? 'var(--primary)' : 'var(--danger)') + ';flex:0 0 auto;font-size:12px">' + (t.side === 'buy' ? '买入' : '卖出') + '</div>' +
              '<div class="grow"><div class="title">' + esc(t.name) + ' <span style="color:var(--muted)">' + esc(t.code) + '</span></div>' +
              '<div class="desc">' + esc(t.date) + ' · ' + num(t.price).toFixed(2) + ' × ' + num(t.qty) + (t.note ? ' · ' + esc(t.note) : '') + '</div></div>' +
              '<button class="btn mini danger" data-del="' + i + '">' + XU.icon('trash') + '</button></div>').join('')
        : '<div class="empty">暂无交易记录</div>';
    }

    function renderTips() {
      const s = renderStats();
      const box = XU.$('#stockTips', el);
      const tips = [];
      tips.push(s.total >= 0 ? '整体账户为盈利状态，注意及时落袋为安 💰' : '账户暂为浮亏，复盘时先看逻辑是否还成立，别只看价格 📉');
      tips.push(s.market > 0 ? '当前总市值 ' + money(s.market) + '，建议单一持仓不超过总仓位的 50%，控制集中度。' : '还没有持仓，先小仓位建仓、记录每笔交易，养成复盘习惯。');
      tips.push('行情每天自动更新；盘中点「刷新行情」可看实时价，收盘后也可手动记价 📊');
      box.innerHTML = tips.map((t) => '<div class="row-item"><div style="width:34px;height:34px;border-radius:10px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:15px;flex:0 0 auto">💡</div><div class="grow"><div class="desc">' + t + '</div></div></div>').join('');
    }

    function addStockModal() {
      XU.modal(
        '<h3>＋ 添加自选股</h3>' +
        '<label class="lbl">股票代码</label><input type="text" id="sCode" maxlength="8" placeholder="例如 600519 / 000001" style="text-transform:uppercase">' +
        '<label class="lbl">名称</label><input type="text" id="sName" maxlength="20" placeholder="例如 贵州茅台">' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">添加</button></div>',
        { onMount: (mask, close) => {
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const code = XU.$('#sCode', mask).value.trim();
            const name = XU.$('#sName', mask).value.trim();
            if (!code || !name) { XU.toast('请填写代码和名称'); return; }
            if (data.watch.some((w) => w.code === code)) { XU.toast('已在自选里了'); return; }
            data.watch.push({ code: code, name: name });
            await saveData(data);
            close(); renderWatch();
            XU.toast('已添加自选 ✅');
          };
        } }
      );
    }

    function tradeModal(initCode) {
      const codes = {};
      data.watch.forEach((w) => { if (w.type !== 'fund') codes[w.code] = w.name; });
      data.trades.forEach((t) => { if (!codes[t.code]) codes[t.code] = t.name; });
      const opts = Object.keys(codes).map((c) => '<option value="' + esc(c) + '"' + (c === initCode ? ' selected' : '') + '>' + esc(c) + ' ' + esc(codes[c]) + '</option>').join('');
      XU.modal(
        '<h3>🧾 记一笔交易</h3>' +
        (opts ? '<label class="lbl">股票</label><select id="sPick">' + opts + '</select>' :
          '<label class="lbl">股票代码</label><input type="text" id="sCode2" maxlength="8" placeholder="600519">' +
          '<label class="lbl">名称</label><input type="text" id="sName2" maxlength="20" placeholder="贵州茅台">') +
        '<label class="lbl">方向</label>' +
        '<div class="seg" id="sSide"><button class="on" data-v="buy">买入</button><button data-v="sell">卖出</button></div>' +
        '<div class="grid2">' +
          '<div><label class="lbl">价格</label><input type="number" id="sPrice" step="0.001" min="0" placeholder="如 12.50"></div>' +
          '<div><label class="lbl">数量（股）</label><input type="number" id="sQty" step="100" min="100" placeholder="100"></div>' +
        '</div>' +
        '<label class="lbl">日期</label><input type="date" id="sDate" value="' + XU.today() + '">' +
        '<label class="lbl">备注（可选）</label><input type="text" id="sNote" maxlength="40" placeholder="例如：加仓 / 止损">' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
        { onMount: (mask, close) => {
          let side = 'buy';
          XU.$('#sSide', mask).addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            side = b.getAttribute('data-v');
            XU.$$('#sSide button', mask).forEach((x) => x.classList.toggle('on', x === b));
          });
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const code = opts ? XU.$('#sPick', mask).value : XU.$('#sCode2', mask).value.trim();
            const name = opts ? codes[code] : XU.$('#sName2', mask).value.trim();
            const price = num(XU.$('#sPrice', mask).value);
            const qty = num(XU.$('#sQty', mask).value);
            if (!code || !name) { XU.toast('请填写股票信息'); return; }
            if (!price || !qty) { XU.toast('请填写价格和数量'); return; }
            data.trades.push({ id: 't' + Date.now().toString(36), code: code, name: name, side: side, price: price, qty: qty, date: XU.$('#sDate', mask).value || XU.today(), note: XU.$('#sNote', mask).value.trim(), time: XU.now() });
            if (!data.watch.some((w) => w.code === code)) data.watch.push({ code: code, name: name });
            await saveData(data);
            close(); renderWatch(); renderTrades(); renderTips();
            XU.toast('交易已记录 ✅');
          };
        } }
      );
    }    /* ---------- 行情中心 ---------- */
    function renderMarket() {
      const box = XU.$('#stMarket', el);
      const indices = (live && live.indices && live.indices.length) ? live.indices : (snap ? snap.indices : []);
      const secs = (live && live.sectors && live.sectors.length) ? live.sectors : (snap ? snap.sectors : []);
      const concepts = (live && live.concepts && live.concepts.length) ? live.concepts : (snap ? snap.concepts : []);
      const movers = snap ? snap.movers : [];
      const timeStr = liveTime ? ('实时数据 · ' + liveTime) : (snap && snap.time ? '快照数据 · ' + snap.time : '暂无快照，待每日自动更新');
      const banner = liveTime
        ? '<div class="live-banner"><span class="lb-dot"></span><div><b>实时行情已刷新</b><div class="sub">' + esc(liveTime) + ' · 进入本页自动拉取，盘中每 60 秒自动更新</div></div></div>'
        : '<div class="snap-banner">⏰ <b>当前为每日快照（约 07:20 自动更新）</b><div class="sub">非盘中实时 · 点右上角「🔄 刷新行情」立即获取实时数据</div></div>';
      box.innerHTML = banner +
        '<div class="card">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
            '<div><h2 style="margin:0">📈 大盘指数</h2><p class="sub" style="margin:2px 0 0">' + esc(timeStr) + '</p></div>' +
            '<button class="btn mini" id="mkRefresh">🔄 刷新</button>' +
          '</div>' +
          (indices.length
            ? '<div class="grid3" style="grid-template-columns:repeat(2,1fr);margin-top:10px">' + indices.map((it) =>
                '<div class="stat-card"><div class="lab">' + esc(it.name) + '</div>' +
                '<div class="num" style="font-size:16px;color:' + (it.pct > 0 ? 'var(--ok)' : it.pct < 0 ? 'var(--danger)' : 'var(--text)') + '">' + (it.price != null ? it.price.toFixed(2) : '—') + '</div>' +
                '<div class="lab" style="color:' + col(it.pct) + '">' + (it.pct != null ? sgnPct(it.pct) : '—') + '</div></div>').join('') + '</div>'
            : '<div class="empty">指数数据待每日自动更新（约 07:20）</div>') +
        '</div>' +
        '<div class="card">' +
          '<h2>🧩 板块行情</h2>' +
          '<div class="seg" id="mkSeg" style="margin:10px 0">' +
            '<button class="' + (sectorKind === 'sectors' ? 'on' : '') + '" data-k="sectors">行业板块</button>' +
            '<button class="' + (sectorKind === 'concepts' ? 'on' : '') + '" data-k="concepts">概念板块</button>' +
          '</div>' +
          '<div class="list">' + ((sectorKind === 'sectors' ? secs : concepts).length
            ? (sectorKind === 'sectors' ? secs : concepts).map((s) =>
                '<div class="row-item"><div class="grow"><div class="title">' + esc(s.name) + ' <span style="color:var(--muted)">' + esc(s.code) + '</span></div><div class="desc">涨跌 ' + (s.chg != null ? s.chg.toFixed(2) : '—') + '</div></div>' +
                '<div style="text-align:right"><div style="font-weight:800;color:' + col(s.pct) + '">' + (s.pct != null ? sgnPct(s.pct) : '—') + '</div></div></div>').join('')
            : '<div class="empty">板块数据待每日自动更新</div>') + '</div>' +
        '</div>' +
        '<div class="card">' +
          '<h2>🚀 领涨个股</h2>' +
          '<div class="list">' + (movers.length
            ? movers.map((s) =>
                '<div class="row-item"><div class="grow"><div class="title">' + esc(s.name) + ' <span style="color:var(--muted)">' + esc(s.code) + '</span></div><div class="desc">最新 ' + (s.price != null ? s.price.toFixed(2) : '—') + '</div></div>' +
                '<div style="text-align:right"><div style="font-weight:800;color:' + col(s.pct) + '">' + (s.pct != null ? sgnPct(s.pct) : '—') + '</div></div></div>').join('')
            : '<div class="empty">个股数据待每日自动更新</div>') + '</div>' +
        '</div>' +
        '<p class="sub" style="padding:0 4px">行情快照由免费云端每日自动抓取；盘中点「刷新」尝试获取实时数据（需联网）</p>';
    }

    /* ---------- 基金估值 ---------- */
    function renderFunds() {
      const box = XU.$('#fundList', el);
      const funds = data.watch.filter((w) => w.type === 'fund');
      box.innerHTML = funds.length
        ? funds.map((f) => {
            const q = fundQuoteOf(f.code);
            const gsz = q && q.gsz != null ? num(q.gsz) : null;
            const zzl = q && q.gszzl != null ? num(q.gszzl) : null;
            const t = q && q.gztime ? q.gztime : '';
            return '<div class="card" style="margin-bottom:10px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
                '<div style="display:flex;align-items:center;gap:8px;min-width:0">' +
                  '<div style="width:38px;height:38px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--primary);flex:0 0 auto">基金</div>' +
                  '<div><div class="title" style="font-weight:800">' + esc(f.name) + '</div>' +
                  '<div class="vd">' + esc(f.code) + (t ? ' · ' + esc(t) : '') + '</div></div>' +
                '</div>' +
                '<div style="text-align:right;flex:0 0 auto">' +
                  '<div class="num" style="font-weight:800;color:' + (zzl == null ? 'var(--muted)' : col(zzl)) + '">' + (zzl == null ? '—' : sgnPct(zzl)) + '</div>' +
                  '<div class="vd">估值 ' + (gsz != null ? gsz.toFixed(4) : '—') + '</div>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
                '<button class="btn mini ghost" data-fundlive="' + esc(f.code) + '">刷新估值</button>' +
                '<button class="btn mini danger" data-delfund="' + esc(f.code) + '">移除</button>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<div class="empty">还没有关注基金，用下方搜索或手动添加～</div>';
    }

    function renderFundSearch(kw) {
      const box = XU.$('#fundSearchList', el);
      const q = (kw || '').trim();
      let list = q ? fundSearch.filter((f) => f.name.indexOf(q) >= 0 || f.code.indexOf(q) >= 0) : fundSearch;
      box.innerHTML = (list.length ? list : fundSearch).slice(0, 12).map((f) => {
        const added = data.watch.some((w) => w.code === f.code);
        return '<button class="dest-pick" data-fundadd="' + esc(f.code) + '">' +
          '<b>' + esc(f.name) + '</b><i>' + esc(f.code) + (added ? ' · 已添加' : ' · 点击添加') + '</i></button>';
      }).join('') || '<div class="empty">没有匹配的基金，试试其他关键词</div>';
    }

    function renderFund() {
      const box = XU.$('#stFund', el);
      box.innerHTML =
        '<div class="card">' +
          '<h2>💰 我的基金</h2>' +
          '<p class="sub">估值来自每日自动快照；点「刷新估值」可获取实时估算（仅供参考）</p>' +
          '<div id="fundList"></div>' +
        '</div>' +
        '<div class="card">' +
          '<h2>🔍 搜索基金</h2>' +
          '<p class="sub">从热门基金库搜索并添加</p>' +
          '<div style="display:flex;gap:8px">' +
            '<input type="search" id="fundKw" placeholder="基金名称或代码，如 白酒 / 161725" style="flex:1">' +
            '<button class="btn" id="fundSearchBtn">搜索</button>' +
          '</div>' +
          '<div id="fundSearchList" style="margin-top:10px;display:grid;grid-template-columns:1fr;gap:8px"></div>' +
        '</div>' +
        '<div class="card">' +
          '<h2>➕ 手动添加基金</h2>' +
          '<div style="display:flex;gap:8px">' +
            '<input type="text" id="fCode" placeholder="基金代码 如 161725" style="flex:1;min-width:0">' +
            '<input type="text" id="fName" placeholder="基金名称" style="flex:1;min-width:0">' +
            '<button class="btn" id="fAdd" style="flex:0 0 auto">添加</button>' +
          '</div>' +
        '</div>';
      renderFunds(); renderFundSearch('');
      XU.$('#fundSearchBtn', box).onclick = () => renderFundSearch(XU.$('#fundKw', box).value);
      XU.$('#fundKw', box).addEventListener('keydown', (e) => { if (e.key === 'Enter') renderFundSearch(XU.$('#fundKw', box).value); });
      XU.$('#fAdd', box).onclick = async () => {
        const code = XU.$('#fCode', box).value.trim();
        const name = XU.$('#fName', box).value.trim();
        if (!code || !name) { XU.toast('请填写基金代码和名称'); return; }
        if (data.watch.some((w) => w.code === code)) { XU.toast('已在列表里'); return; }
        data.watch.push({ code: code, name: name, type: 'fund' });
        await saveData(data);
        XU.$('#fCode', box).value = ''; XU.$('#fName', box).value = '';
        renderFunds(); renderFundSearch('');
        XU.toast('已添加基金 ✅');
      };
    }    /* ---------- 实时刷新 ---------- */
    async function doRefresh(silent) {
      if (!silent) XU.toast('正在刷新实时行情…');
      const result = { indices: [], stocks: {}, sectors: [], concepts: [], funds: {} };
      const EM = 'https://push2.eastmoney.com/api/qt/';
      const tasks = [];
      tasks.push(jsonp(EM + 'ulist.np/get?fltt=2&invt=2&secids=1.000001,0.399001,0.399006,1.000300,1.000688&fields=f2,f3,f4,f12,f14&cb=__CB__')
        .then((d) => ((d && d.data && d.data.diff) || []).forEach((r) => { if (r.f12) result.indices.push({ code: r.f12, name: r.f14, price: num(r.f2), chg: num(r.f4), pct: num(r.f3) }); }))
        .catch(() => {}));
      tasks.push(jsonp(EM + 'clist/get?pn=1&pz=15&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m%3A90%2Bt%3A2&fields=f2,f3,f4,f12,f14&cb=__CB__')
        .then((d) => ((d && d.data && d.data.diff) || []).forEach((r) => { if (r.f12) result.sectors.push({ code: r.f12, name: r.f14, price: num(r.f2), chg: num(r.f4), pct: num(r.f3) }); }))
        .catch(() => {}));
      tasks.push(jsonp(EM + 'clist/get?pn=1&pz=12&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m%3A90%2Bt%3A3&fields=f2,f3,f4,f12,f14&cb=__CB__')
        .then((d) => ((d && d.data && d.data.diff) || []).forEach((r) => { if (r.f12) result.concepts.push({ code: r.f12, name: r.f14, price: num(r.f2), chg: num(r.f4), pct: num(r.f3) }); }))
        .catch(() => {}));
      const stockCodes = [];
      data.watch.forEach((w) => { if (w.type !== 'fund' && w.code) stockCodes.push(w.code); });
      const uniq = stockCodes.filter((c, i) => stockCodes.indexOf(c) === i);
      if (uniq.length) {
        tasks.push(jsonp(EM + 'ulist.np/get?fltt=2&invt=2&secids=' + uniq.map(secidOf).join(',') + '&fields=f2,f3,f4,f12,f14&cb=__CB__')
          .then((d) => ((d && d.data && d.data.diff) || []).forEach((r) => { if (r.f12) result.stocks[String(r.f12)] = { code: r.f12, name: r.f14, price: num(r.f2), pct: num(r.f3), chg: num(r.f4) }; }))
          .catch(() => {}));
      }
      const fundCodes = [];
      data.watch.forEach((w) => { if (w.type === 'fund' && w.code) fundCodes.push(w.code); });
      fundCodes.filter((c, i) => fundCodes.indexOf(c) === i).forEach((code) => {
        tasks.push(fundLive(code).then((f) => { result.funds[code] = { code: code, name: f.name, gsz: num(f.gsz), gszzl: num(f.gszzl), dwjz: num(f.dwjz), gztime: f.gztime || '' }; }).catch(() => {}));
      });
      await Promise.all(tasks);
      live = result;
      liveTime = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      const gotAny = result.indices.length || result.sectors.length || result.concepts.length || Object.keys(result.stocks).length || Object.keys(result.funds).length;
      if (!silent) XU.toast(gotAny ? '实时行情已刷新 ✅' : '实时行情获取失败（网络受限），显示最近快照');
      renderAll();
    }

    async function refreshOneFund(code) {
      try {
        const f = await fundLive(code);
        live = live || { indices: [], stocks: {}, sectors: [], concepts: [], funds: {} };
        live.funds[code] = { code: code, name: f.name, gsz: num(f.gsz), gszzl: num(f.gszzl), dwjz: num(f.dwjz), gztime: f.gztime || '' };
        renderFunds();
        XU.toast('基金估值已刷新 ✅');
      } catch (e) { XU.toast('获取失败，请检查网络'); }
    }

    function renderAll() {
      renderWatch(); renderTrades(); renderTips(); renderMarket(); renderFunds(); renderFundSearch(XU.$('#fundKw', el) ? XU.$('#fundKw', el).value : '');
    }

    /* ---------- 骨架 ---------- */
    el.innerHTML =
      '<div class="hero">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
          '<div><h2 style="color:#fff;margin:0 0 4px">📊 股票基金</h2>' +
          '<p style="margin:0;font-size:12.5px;opacity:.92">自选复盘 · 板块个股行情 · 基金估值</p></div>' +
          '<button class="btn mini" id="stRefresh" style="background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.35)">🔄 刷新行情</button>' +
        '</div>' +
      '</div>' +
      '<div class="tabs" id="stTabs">' +
        '<button class="tab active" data-t="hold">自选持仓</button>' +
        '<button class="tab" data-t="market">行情中心</button>' +
        '<button class="tab" data-t="fund">基金估值</button>' +
      '</div>' +
      '<div id="stHold"></div>' +
      '<div id="stMarket" hidden></div>' +
      '<div id="stFund" hidden></div>';

    function renderHold() {
      const box = XU.$('#stHold', el);
      box.innerHTML =
        '<div class="card">' +
          '<div class="grid3" id="stockStats" style="grid-template-columns:repeat(2,1fr)"></div>' +
          '<p class="sub" style="margin-top:10px">总盈亏：<b id="stockTotal">—</b></p>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn" style="flex:1" id="stockAdd">＋ 添加自选</button>' +
            '<button class="btn ghost" style="flex:1" id="stockTrade">＋ 记一笔交易</button>' +
          '</div>' +
        '</div>' +
        '<div class="card"><h2>📈 自选持仓</h2><p class="sub">行情每日自动更新 · 也可点「记收盘价」手动维护</p><div id="stockWatch"></div></div>' +
        '<div class="card"><h2>💡 复盘建议</h2><div class="list" id="stockTips"></div></div>' +
        '<div class="card"><h2>🧾 交易流水</h2><p class="sub">全部买卖记录，可随时删除</p><div class="list" id="stockTrades"></div></div>';
      renderWatch(); renderTrades(); renderTips();
      XU.$('#stockAdd', el).onclick = addStockModal;
      XU.$('#stockTrade', el).onclick = () => tradeModal();
    }

    renderHold();
    renderMarket();
    renderFund();

    XU.$('#stRefresh', el).onclick = doRefresh;
    /* 自动刷新：进入面板立即拉取实时行情，盘中每 60 秒自动更新（离开页面自动停止） */
    doRefresh(true);
    const stAutoTimer = setInterval(() => {
      if (!el.isConnected) { clearInterval(stAutoTimer); return; }
      doRefresh(true);
    }, 60000);
    XU.$('#stTabs', el).addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      tab = b.getAttribute('data-t');
      XU.$$('#stTabs .tab', el).forEach((x) => x.classList.toggle('active', x === b));
      XU.$('#stHold', el).hidden = tab !== 'hold';
      XU.$('#stMarket', el).hidden = tab !== 'market';
      XU.$('#stFund', el).hidden = tab !== 'fund';
    });

    XU.$('#stMarket', el).addEventListener('click', (e) => {
      const r = e.target.closest('#mkRefresh');
      if (r) { doRefresh(); return; }
      const seg = e.target.closest('[data-k]');
      if (seg) {
        sectorKind = seg.getAttribute('data-k');
        renderMarket();
      }
    });

    XU.$('#stFund', el).addEventListener('click', async (e) => {
      const add = e.target.closest('[data-fundadd]');
      if (add) {
        const code = add.getAttribute('data-fundadd');
        const f = fundSearch.find((x) => x.code === code) || { code: code, name: code };
        if (data.watch.some((w) => w.code === code)) { XU.toast('已在列表里'); return; }
        data.watch.push({ code: code, name: f.name, type: 'fund' });
        await saveData(data);
        renderFunds(); renderFundSearch(XU.$('#fundKw', el) ? XU.$('#fundKw', el).value : '');
        XU.toast('已添加 ' + f.name + ' ✅');
        return;
      }
      const liveBtn = e.target.closest('[data-fundlive]');
      if (liveBtn) { refreshOneFund(liveBtn.getAttribute('data-fundlive')); return; }
      const del = e.target.closest('[data-delfund]');
      if (del) {
        const code = del.getAttribute('data-delfund');
        XU.confirm('移除基金 ' + esc(code) + '？', async () => {
          data.watch = data.watch.filter((w) => !(w.type === 'fund' && w.code === code));
          await saveData(data);
          renderFunds(); renderFundSearch('');
        }, true);
      }
    });

    el.addEventListener('click', (e) => {
      const priceBtn = e.target.closest('[data-price]');
      if (priceBtn) {
        const code = priceBtn.getAttribute('data-price');
        const name = (data.watch.find((w) => w.code === code) || {}).name || code;
        XU.modal(
          '<h3>📉 记录 ' + esc(name) + '（' + esc(code) + '）收盘价</h3>' +
          '<label class="lbl">日期</label><input type="date" id="pDate" value="' + XU.today() + '">' +
          '<label class="lbl">收盘价</label><input type="number" id="pVal" step="0.001" min="0" placeholder="如 12.50">' +
          '<p class="sub">连续记录后自动生成走势曲线，便于复盘</p>' +
          '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
          { onMount: (mask, close) => {
            XU.$('[data-x=no]', mask).onclick = close;
            XU.$('[data-x=yes]', mask).onclick = async () => {
              const date = XU.$('#pDate', mask).value || XU.today();
              const val = num(XU.$('#pVal', mask).value);
              if (!val) { XU.toast('请填写收盘价'); return; }
              data.prices[code] = data.prices[code] || {};
              data.prices[code][date] = val;
              await saveData(data);
              close(); renderWatch(); renderTips();
              XU.toast('已记录 ' + date + ' 收盘价 ✅');
            };
          } }
        );
        return;
      }
      const tradeBtn = e.target.closest('[data-trade]');
      if (tradeBtn) { tradeModal(tradeBtn.getAttribute('data-trade')); return; }
      const delw = e.target.closest('[data-delwatch]');
      if (delw) {
        const code = delw.getAttribute('data-delwatch');
        XU.confirm('从自选移除 ' + esc(code) + '？（交易记录会保留）', async () => {
          data.watch = data.watch.filter((w) => w.code !== code);
          await saveData(data);
          renderWatch();
        }, true);
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        const i = parseInt(del.getAttribute('data-del'), 10);
        XU.confirm('删除这笔交易记录？', async () => {
          data.trades.splice(i, 1);
          await saveData(data);
          renderWatch(); renderTrades(); renderTips();
        }, true);
      }
    });
  });
})();