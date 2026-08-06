/* panels/fishing.js —— 钓鱼：每次鱼获/重量/费用记录 + 历史累计统计 */
(function () {
  const XU = window.XU;
  const KEY = 'fishing';
  const FISH_TYPES = ['鲤鱼', '草鱼', '鲫鱼', '鲢鳙', '青鱼', '罗非', '翘嘴', '鲈鱼', '黑鱼', '黄颡', '其他'];

  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    return rec && rec.trips ? rec : { trips: [] };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function fmt(n, unit) { return (Math.round(n * 100) / 100) + (unit || ''); }
  function fmtMoney(n) { return '¥' + (Math.round(n * 100) / 100).toLocaleString('zh-CN'); }

  function tripWeight(t) { return t.fish.reduce((s, f) => s + num(f.weight), 0); }
  function tripBack(t) {
    const manual = num(t.backTotal);
    if (t.backTotal !== undefined && t.backTotal !== '' && manual !== 0) return manual;
    return num(t.backWeight) * num(t.backPrice);
  }

  XU.regPanel('fishing', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();

    function totals() {
      let trips = 0, weight = 0, fee = 0, back = 0;
      data.trips.forEach((t) => {
        trips++;
        weight += tripWeight(t);
        fee += num(t.fee);
        back += tripBack(t);
      });
      return { trips: trips, weight: weight, fee: fee, back: back };
    }

    function renderStats() {
      const t = totals();
      const box = XU.$('#fishStats', el);
      box.innerHTML =
        statCard('🎣', t.trips + ' 次', '累计出钓') +
        statCard('🐟', fmt(t.weight, ' kg'), '累计鱼获') +
        statCard('💸', fmt(t.fee, ''), '累计钓费') +
        statCard('💰', fmt(t.back, ''), '累计回鱼款');
      const net = t.back - t.fee;
      XU.$('#fishNet', el).textContent = (net >= 0 ? '净回本 ' : '净支出 ') + fmtMoney(Math.abs(net));
    }

    function statCard(emoji, num2, lab) {
      return '<div class="stat-card"><div class="ico">' + emoji + '</div><div class="num">' + num2 + '</div><div class="lab">' + lab + '</div></div>';
    }

    function renderList() {
      const box = XU.$('#fishList', el);
      const trips = data.trips.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      box.innerHTML = trips.length
        ? trips.map((t, i) => {
            const w = tripWeight(t);
            const back = tripBack(t);
            const fee = num(t.fee);
            const net = back - fee;
            const fishHtml = t.fish.map((f) => '<span class="chip">' + XU.esc(f.name || '鱼') + ' ' + fmt(num(f.weight), 'kg') + '</span>').join('');
            return '<div class="row-item" style="align-items:flex-start">' +
              '<div style="width:42px;height:42px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:20px;flex:0 0 auto">🎣</div>' +
              '<div class="grow">' +
                '<div class="title" style="font-weight:800">' + XU.esc(t.date) + (t.spot ? ' · ' + XU.esc(t.spot) : '') + '</div>' +
                '<div class="desc" style="margin:4px 0 6px">总重 <b>' + fmt(w, 'kg') + '</b> · 钓费 <b>' + fmtMoney(fee) + '</b> · 回鱼 <b>' + fmtMoney(back) + '</b> · 盈亏 <b style="color:' + (net >= 0 ? 'var(--ok)' : 'var(--danger)') + '">' + (net >= 0 ? '+' : '') + fmtMoney(net) + '</b></div>' +
                (fishHtml ? '<div style="display:flex;flex-wrap:wrap;gap:5px">' + fishHtml + '</div>' : '') +
              '</div>' +
              '<button class="btn mini danger" data-del="' + i + '">' + XU.icon('trash') + '</button>' +
            '</div>';
          }).join('')
        : '<div class="empty">还没有出钓记录，点下方「记录一次出钓」开始 🎣</div>';
    }

    el.innerHTML =
      '<div class="hero">' +
        '<h2 style="color:#fff;margin:0 0 4px">🎣 钓鱼账本</h2>' +
        '<p style="margin:0;font-size:12.5px;opacity:.92">每次鱼获、钓费、回鱼单价一笔记清，累计一目了然</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="grid3" id="fishStats" style="grid-template-columns:repeat(2,1fr)"></div>' +
        '<p class="sub" style="margin-top:10px">历史累计：<b id="fishNet">—</b></p>' +
        '<button class="btn" style="width:100%;padding:14px" id="fishAdd">＋ 记录一次出钓</button>' +
      '</div>' +
      '<div class="card"><h2>📒 出钓记录</h2><p class="sub">按日期倒序 · 点击垃圾桶可删除</p><div class="list" id="fishList"></div></div>';

    renderStats(); renderList();

    XU.$('#fishAdd', el).onclick = () => addTrip();

    function addTrip() {
      const form =
        '<h3>🎣 记录一次出钓</h3>' +
        '<label class="lbl">日期</label><input type="date" id="fDate" value="' + XU.today() + '">' +
        '<label class="lbl">钓点（可选）</label><input type="text" id="fSpot" maxlength="30" placeholder="例如：黑龙潭水库">' +
        '<div class="grid2">' +
          '<div><label class="lbl">钓费（元）</label><input type="number" id="fFee" min="0" step="0.01" placeholder="0"></div>' +
          '<div><label class="lbl">回鱼单价（元/kg）</label><input type="number" id="fBPrice" min="0" step="0.1" placeholder="如 6"></div>' +
        '</div>' +
        '<div class="grid2">' +
          '<div><label class="lbl">回鱼重量（kg）</label><input type="number" id="fBWeight" min="0" step="0.1" placeholder="留空则按鱼获总重"></div>' +
          '<div><label class="lbl">回鱼总价（元，自动算）</label><input type="number" id="fBTotal" min="0" step="0.01" placeholder="自动计算"></div>' +
        '</div>' +
        '<label class="lbl">鱼获明细</label>' +
        '<div id="fFish"></div>' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes" style="flex:1">保存记录</button></div>';

      XU.modal(form, { onMount: (mask, close) => {
        const fishBox = XU.$('#fFish', mask);
        const bWeight = XU.$('#fBWeight', mask);
        const bPrice = XU.$('#fBPrice', mask);
        const bTotal = XU.$('#fBTotal', mask);
        let rows = [{ name: '鲤鱼', weight: '' }];

        function syncTotal() {
          if (bWeight.value && bPrice.value) {
            bTotal.value = (num(bWeight.value) * num(bPrice.value)).toFixed(2);
          }
        }
        bWeight.addEventListener('input', syncTotal);
        bPrice.addEventListener('input', syncTotal);

        function renderFish() {
          fishBox.innerHTML = rows.map((r, i) =>
            '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">' +
              '<select style="flex:1;padding:9px 10px;border-radius:12px;border:1.5px solid var(--primary-soft);background:#fff;color:var(--text);font-size:14px;outline:none;font-family:inherit">' +
                FISH_TYPES.map((f) => '<option' + (f === r.name ? ' selected' : '') + '>' + f + '</option>').join('') +
              '</select>' +
              '<input type="number" step="0.01" min="0" placeholder="重量kg" value="' + (r.weight || '') + '" style="width:96px;padding:9px 10px;border-radius:12px;border:1.5px solid var(--primary-soft);background:#fff;color:var(--text);font-size:14px;outline:none;font-family:inherit">' +
              (rows.length > 1 ? '<button class="btn mini danger" data-i="' + i + '">' + XU.icon('trash') + '</button>' : '') +
            '</div>').join('') +
            '<button class="btn mini ghost" id="fAddFish">＋ 添加一条鱼获</button>';
          XU.$('#fAddFish', mask).onclick = () => { rows.push({ name: '鲫鱼', weight: '' }); renderFish(); };
          XU.$$('#fFish .btn.danger', mask).forEach((b) => {
            b.onclick = () => { rows.splice(parseInt(b.getAttribute('data-i'), 10), 1); renderFish(); };
          });
        }
        renderFish();

        XU.$('[data-x=no]', mask).onclick = close;
        XU.$('[data-x=yes]', mask).onclick = async () => {
          const fish = [];
          XU.$$('#fFish > div', mask).forEach((row) => {
            const sel = row.querySelector('select');
            const w = row.querySelector('input');
            if (w.value !== '' && num(w.value) > 0) fish.push({ name: sel ? sel.value : '鱼', weight: num(w.value) });
          });
          if (!fish.length) { XU.toast('请至少填一条鱼获及重量'); return; }
          const trip = {
            id: 'f' + Date.now().toString(36),
            date: XU.$('#fDate', mask).value || XU.today(),
            spot: XU.$('#fSpot', mask).value.trim(),
            fee: XU.$('#fFee', mask).value,
            backPrice: bPrice.value,
            backWeight: bWeight.value,
            backTotal: bTotal.value,
            fish: fish,
            time: XU.now()
          };
          data.trips.push(trip);
          await saveData(data);
          close(); renderStats(); renderList();
          XU.toast('已记录，共 ' + fmt(tripWeight(trip), 'kg') + ' 🎉');
        };
      } });
    }

    XU.$('#fishList', el).addEventListener('click', async (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const i = parseInt(del.getAttribute('data-del'), 10);
      XU.confirm('删除这条出钓记录？', async () => {
        data.trips.splice(i, 1);
        await saveData(data);
        renderStats(); renderList();
      }, true);
    });
  });
})();