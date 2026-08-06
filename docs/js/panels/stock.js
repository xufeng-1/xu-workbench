/* panels/stock.js —— 股票复盘：自选股 + 交易流水 + 每日收盘价 + 持仓盈亏 */
(function () {
  const XU = window.XU;
  const KEY = 'stock';

  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    return rec && rec.trades ? rec : { watch: [], trades: [], prices: {} };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function money(n) {
    const v = Math.round(n * 100) / 100;
    return (v < 0 ? '-' : '') + '¥' + Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(n) { return (Math.round(n * 1000) / 10) + '%'; }

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

    function latestPrice(code) {
      const pts = data.prices[code];
      if (pts) {
        const ds = Object.keys(pts).sort();
        if (ds.length) return num(pts[ds[ds.length - 1]]);
      }
      const t = data.trades.filter((x) => x.code === code).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      return t ? num(t.price) : 0;
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
    }

    function renderStats() {
      const pos = positionsOf(data.trades);
      const codes = {};
      data.trades.forEach((t) => { codes[t.code] = true; });
      data.watch.forEach((w) => { codes[w.code] = true; });
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
        statCard('💼', money(market), '总市值') +
        statCard('🧾', money(costBase), '持仓成本') +
        statCard('📈', money(float), '浮动盈亏') +
        statCard('✅', money(realized), '已实现盈亏');
      const total = float + realized;
      XU.$('#stockTotal', el).textContent = (total >= 0 ? '+' : '') + money(total) + '（' + (total >= 0 ? '赚' : '亏') + '了 ' + money(Math.abs(total)) + '）';
      return { float: float, realized: realized, total: total, market: market };
    }
    function statCard(emoji, num2, lab) {
      return '<div class="stat-card"><div class="ico">' + emoji + '</div><div class="num" style="font-size:16px">' + num2 + '</div><div class="lab">' + lab + '</div></div>';
    }

    function renderWatch() {
      const box = XU.$('#stockWatch', el);
      const codes = {};
      data.watch.forEach((w) => { codes[w.code] = w.name; });
      data.trades.forEach((t) => { if (!codes[t.code]) codes[t.code] = t.name; });
      const list = Object.keys(codes);
      box.innerHTML = list.length
        ? list.map((code) => {
            const p = positionsOf(data.trades)[code] || { qty: 0, cost: 0, realized: 0 };
            const lp = latestPrice(code);
            const mv = p.qty * lp;
            const fl = (lp - p.cost) * p.qty;
            const flpct = p.cost && p.qty ? ((lp - p.cost) / p.cost) * 100 : 0;
            return '<div class="card" style="margin-bottom:10px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
                '<div style="display:flex;align-items:center;gap:8px;min-width:0">' +
                  '<div style="width:38px;height:38px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--primary);flex:0 0 auto">' + XU.esc(code) + '</div>' +
                  '<div><div class="title" style="font-weight:800">' + XU.esc(codes[code]) + '</div>' +
                  '<div class="vd">持仓 ' + (p.qty || 0) + ' 股 · 成本 ' + (p.cost ? p.cost.toFixed(3) : '—') + '</div></div>' +
                '</div>' +
                '<div style="text-align:right;flex:0 0 auto">' +
                  '<div class="num" style="font-weight:800;color:' + (fl >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + (fl >= 0 ? '+' : '') + money(fl) + '</div>' +
                  '<div class="vd">' + pct(flpct) + ' · 现价 ' + (lp || '—') + '</div>' +
                '</div>' +
              '</div>' +
              sparkline(code) +
              '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
                '<button class="btn mini" data-price="' + XU.esc(code) + '">记收盘价</button>' +
                '<button class="btn mini ghost" data-trade="' + XU.esc(code) + '">记一笔交易</button>' +
                '<button class="btn mini danger" data-delwatch="' + XU.esc(code) + '">移除</button>' +
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
              '<div class="grow"><div class="title">' + XU.esc(t.name) + ' <span style="color:var(--muted)">' + XU.esc(t.code) + '</span></div>' +
              '<div class="desc">' + XU.esc(t.date) + ' · ' + num(t.price).toFixed(2) + ' × ' + num(t.qty) + (t.note ? ' · ' + XU.esc(t.note) : '') + '</div></div>' +
              '<button class="btn mini danger" data-del="' + i + '">' + XU.icon('trash') + '</button></div>').join('')
        : '<div class="empty">暂无交易记录</div>';
    }

    function renderTips() {
      const s = renderStats();
      const box = XU.$('#stockTips', el);
      const tips = [];
      tips.push(s.total >= 0 ? '整体账户为盈利状态，注意及时落袋为安 💰' : '账户暂为浮亏，复盘时先看逻辑是否还成立，别只看价格 📉');
      tips.push(s.market > 0 ? '当前总市值 ' + money(s.market) + '，建议单一持仓不超过总仓位的 50%，控制集中度。' : '还没有持仓，先小仓位建仓、记录每笔交易，养成复盘习惯。');
      tips.push('每天收盘后点「记收盘价」，连续记录就能生成走势曲线，复盘更直观 📊');
      box.innerHTML = tips.map((t) => '<div class="row-item"><div style="width:34px;height:34px;border-radius:10px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:15px;flex:0 0 auto">💡</div><div class="grow"><div class="desc">' + t + '</div></div></div>').join('');
    }

    el.innerHTML =
      '<div class="hero">' +
        '<h2 style="color:#fff;margin:0 0 4px">📊 股票复盘</h2>' +
        '<p style="margin:0;font-size:12.5px;opacity:.92">手动记交易与收盘价，本机生成持仓、盈亏与走势曲线</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="grid3" id="stockStats" style="grid-template-columns:repeat(2,1fr)"></div>' +
        '<p class="sub" style="margin-top:10px">总盈亏：<b id="stockTotal">—</b></p>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn" style="flex:1" id="stockAdd">＋ 添加自选</button>' +
          '<button class="btn ghost" style="flex:1" id="stockTrade">＋ 记一笔交易</button>' +
        '</div>' +
      '</div>' +
      '<div class="card"><h2>📈 自选持仓</h2><p class="sub">点「记收盘价」每天更新 · 走势自动生成</p><div id="stockWatch"></div></div>' +
      '<div class="card"><h2>💡 复盘建议</h2><div class="list" id="stockTips"></div></div>' +
      '<div class="card"><h2>🧾 交易流水</h2><p class="sub">全部买卖记录，可随时删除</p><div class="list" id="stockTrades"></div></div>';

    renderWatch(); renderTrades(); renderTips();

    XU.$('#stockAdd', el).onclick = () => {
      XU.modal(
        '<h3>➕ 添加自选股</h3>' +
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
    };

    XU.$('#stockTrade', el).onclick = () => tradeModal();

    function tradeModal(initCode) {
      const codes = {};
      data.watch.forEach((w) => { codes[w.code] = w.name; });
      data.trades.forEach((t) => { if (!codes[t.code]) codes[t.code] = t.name; });
      const opts = Object.keys(codes).map((c) => '<option value="' + XU.esc(c) + '"' + (c === initCode ? ' selected' : '') + '>' + XU.esc(c) + ' ' + XU.esc(codes[c]) + '</option>').join('');
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
        '<label class="lbl">备注（可选）</label><input type="text" id="sNote" maxlength="40" placeholder="例如：加仓/止损">' +
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
    }

    el.addEventListener('click', (e) => {
      const priceBtn = e.target.closest('[data-price]');
      if (priceBtn) {
        const code = priceBtn.getAttribute('data-price');
        const name = (data.watch.find((w) => w.code === code) || {}).name || code;
        XU.modal(
          '<h3>📉 记录 ' + XU.esc(name) + '（' + XU.esc(code) + '）收盘价</h3>' +
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
        XU.confirm('从自选移除 ' + XU.esc(code) + '？（交易记录会保留）', async () => {
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