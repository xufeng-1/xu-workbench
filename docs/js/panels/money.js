/* panels/money.js —— 记账：记录 / 月度汇总 / 分类占比图 / 上月查看 */
(function () {
  const XU = window.XU;

  const CATS = {
    out: [
      { id: 'food', label: '餐饮', icon: '🍜' },
      { id: 'transport', label: '交通', icon: '🚌' },
      { id: 'shopping', label: '购物', icon: '🛍️' },
      { id: 'fun', label: '娱乐', icon: '🎬' },
      { id: 'home', label: '居住', icon: '🏠' },
      { id: 'medical', label: '医疗', icon: '💊' },
      { id: 'study', label: '学习', icon: '📚' },
      { id: 'phone', label: '通讯', icon: '📱' },
      { id: 'other', label: '其他', icon: '📦' }
    ],
    in: [
      { id: 'salary', label: '工资', icon: '💼' },
      { id: 'bonus', label: '奖金', icon: '🎁' },
      { id: 'invest', label: '理财', icon: '📈' },
      { id: 'otherin', label: '其他', icon: '💰' }
    ]
  };
  XU.MONEY_CATS = CATS;
  XU.catLabel = (id) => {
    for (const t of ['out', 'in']) {
      const c = CATS[t].find((x) => x.id === id);
      if (c) return c.label;
    }
    return id || '其他';
  };
  XU.catIcon = (id) => {
    for (const t of ['out', 'in']) {
      const c = CATS[t].find((x) => x.id === id);
      if (c) return c.icon;
    }
    return '📦';
  };

  XU.addMoney = function (preset) {
    const t = preset || 'out';
    const cats = CATS[t];
    XU.modal(
      '<h3>记一笔</h3>' +
      '<div class="seg" id="mType">' +
        '<button class="' + (t === 'out' ? 'on' : '') + '" data-t="out">支出</button>' +
        '<button class="' + (t === 'in' ? 'on' : '') + '" data-t="in">收入</button>' +
      '</div>' +
      '<label class="lbl">金额（元）</label><input type="number" id="mAmt" step="0.01" min="0" placeholder="0.00" inputmode="decimal">' +
      '<label class="lbl">分类</label><div class="grid3" id="mCats">' +
        cats.map((c) => '<button class="btn ghost mini" data-cat="' + c.id + '">' + c.icon + ' ' + c.label + '</button>').join('') +
      '</div>' +
      '<label class="lbl">备注（可选）</label><input type="text" id="mNote" maxlength="40" placeholder="如：午餐、地铁">' +
      '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
      { onMount: (mask, close) => {
        let curType = t, curCat = cats[0].id;
        XU.$('#mType', mask).addEventListener('click', (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          curType = b.getAttribute('data-t');
          const c2 = CATS[curType];
          curCat = c2[0].id;
          XU.$$('button', XU.$('#mType', mask)).forEach((x) => x.classList.toggle('on', x === b));
          XU.$('#mCats', mask).innerHTML = c2.map((c) => '<button class="btn ghost mini' + (c.id === curCat ? ' active' : '') + '" data-cat="' + c.id + '">' + c.icon + ' ' + c.label + '</button>').join('');
          XU.$('#mCats', mask).addEventListener('click', (ev) => {
            const cb = ev.target.closest('[data-cat]');
            if (!cb) return;
            curCat = cb.getAttribute('data-cat');
            XU.$$('button', XU.$('#mCats', mask)).forEach((x) => x.classList.toggle('active', x === cb));
          });
        });
        XU.$('#mCats', mask).addEventListener('click', (e) => {
          const b = e.target.closest('[data-cat]');
          if (!b) return;
          curCat = b.getAttribute('data-cat');
          XU.$$('button', XU.$('#mCats', mask)).forEach((x) => x.classList.toggle('active', x === b));
        });
        XU.$('[data-x=no]', mask).onclick = close;
        XU.$('[data-x=yes]', mask).onclick = async () => {
          const amt = parseFloat(XU.$('#mAmt', mask).value);
          if (!amt || amt <= 0) { XU.toast('请输入有效金额'); return; }
          const now = new Date();
          const d = XU.today();
          const entry = {
            id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6),
            date: d,
            time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
            type: curType,
            cat: curCat,
            note: XU.$('#mNote', mask).value.trim(),
            amount: Math.round(amt * 100) / 100
          };
          await XU.Store.set('money', entry);
          close();
          XU.toast('已记账 ✔');
          XU.route();
        };
      } }
    );
  };

  const PALETTE = ['#7C6BD4', '#9A8BDF', '#B9A9E8', '#6FA8E8', '#6FBF8F', '#E8B04B', '#E07A7A', '#D98FD9', '#8A85A6', '#4CAF9E'];

  function donut(data, total) {
    const size = 150, r = 60, cx = size / 2, cy = size / 2;
    let html = '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:150px;height:150px;flex:0 0 auto">';
    let angle = -Math.PI / 2;
    const parts = data.filter((d) => d.value > 0);
    if (!parts.length) {
      html += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--primary-soft)" stroke-width="22"/>';
    }
    parts.forEach((d, i) => {
      const frac = d.value / total;
      const a2 = angle + frac * Math.PI * 2;
      const large = frac > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      html += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" fill="none" stroke="' + PALETTE[i % PALETTE.length] + '" stroke-width="22"/>';
      angle = a2;
    });
    html += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" style="font-size:11px;fill:var(--muted)">本月支出</text>' +
            '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" style="font-size:16px;font-weight:800;fill:var(--primary)">' + XU.money(total).replace('¥', '') + '</text>';
    html += '</svg>';
    return html;
  }

  function legend(data, total) {
    return '<div class="legend">' + data.map((d, i) => {
      const pct = total ? Math.round((d.value / total) * 100) : 0;
      return '<div class="li"><span class="dot" style="background:' + PALETTE[i % PALETTE.length] + '"></span>' +
        '<span class="grow">' + XU.catIcon(d.id) + ' ' + XU.catLabel(d.id) + '</span>' +
        '<span style="font-weight:700">' + XU.money(d.value) + '</span>' +
        '<span style="color:var(--muted);width:38px;text-align:right">' + pct + '%</span></div>';
    }).join('') + '</div>';
  }

  XU.regPanel('money', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const all = await XU.Store.all('money');
    let month = XU.today().slice(0, 7);

    function byMonth(m) { return all.filter((e) => e.date.startsWith(m)); }

    function render() {
      const entries = byMonth(month);
      const out = entries.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0);
      const inc = entries.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0);
      const catSum = {};
      entries.filter((e) => e.type === 'out').forEach((e) => { catSum[e.cat] = (catSum[e.cat] || 0) + e.amount; });
      const catData = Object.keys(catSum).map((id) => ({ id, value: Math.round(catSum[id] * 100) / 100 })).sort((a, b) => b.value - a.value);
      const hasPrev = month > '2026-01';
      const hasNext = month < XU.today().slice(0, 7);

      el.innerHTML =
        '<div class="card">' +
          '<div style="display:flex;align-items:center;justify-content:space-between">' +
            '<h2>💰 记账</h2>' +
            '<div style="display:flex;gap:8px">' +
              '<button class="btn ghost mini" id="importBill">📥 导入账单</button>' +
              '<button class="btn mini" id="addMoney">+ 记一笔</button>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;margin:8px 0">' +
            '<button class="btn ghost mini" id="mPrev"' + (hasPrev ? '' : ' disabled') + '>◀ 上月</button>' +
            '<div class="grow" style="text-align:center;font-weight:700;font-size:15px">' + month + (month === XU.today().slice(0, 7) ? '（本月）' : '') + '</div>' +
            '<button class="btn ghost mini" id="mNext"' + (hasNext ? '' : ' disabled') + '>下月 ▶</button>' +
          '</div>' +
          '<div class="grid3">' +
            '<div class="stat-card"><div class="num">' + XU.money(out).replace('¥', '') + '</div><div class="lab">支出</div></div>' +
            '<div class="stat-card"><div class="num" style="color:var(--ok)">' + XU.money(inc).replace('¥', '') + '</div><div class="lab">收入</div></div>' +
            '<div class="stat-card"><div class="num" style="color:var(--warn)">' + XU.money(inc - out).replace('¥', '') + '</div><div class="lab">结余</div></div>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<h2>📈 本月分类占比</h2>' +
          (catData.length
            ? '<div class="pie-wrap">' + donut(catData, out) + legend(catData, out) + '</div>'
            : '<div class="empty">本月还没有支出记录</div>') +
        '</div>' +

        '<div class="card">' +
          '<h2>🧾 明细记录</h2>' +
          (entries.length
            ? '<div class="list">' + entries.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).map((e) =>
                '<div class="row-item money-item">' +
                  '<div class="ico">' + XU.catIcon(e.cat) + '</div>' +
                  '<div class="grow"><div class="title">' + XU.catLabel(e.cat) + (e.src ? '<span class="src-tag">' + (e.src === 'wechat' ? '微信' : e.src === 'alipay' ? '支付宝' : '') + '</span>' : '') + (e.note ? ' · ' + XU.esc(e.note) : '') + '</div>' +
                  '<div class="desc">' + e.date + ' ' + e.time + '</div></div>' +
                  '<div class="amt ' + (e.type === 'in' ? 'in' : 'out') + '">' + (e.type === 'in' ? '+' : '-') + XU.money(e.amount) + '</div>' +
                  '<button class="btn mini danger" data-del="' + e.id + '">' + XU.icon('trash') + '</button>' +
                '</div>'
              ).join('') + '</div>'
            : '<div class="empty">该月暂无记录</div>') +
        '</div>';

      XU.$('#addMoney', el).onclick = () => XU.addMoney('out');
      XU.$('#importBill', el).onclick = () => XU.bills && XU.bills.open();
      XU.$('#mPrev', el).onclick = () => {
        const [y, m] = month.split('-').map(Number);
        month = (m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0'));
        render();
      };
      XU.$('#mNext', el).onclick = () => {
        const [y, m] = month.split('-').map(Number);
        month = (m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0'));
        render();
      };
      el.addEventListener('click', async (e) => {
        const del = e.target.closest('[data-del]');
        if (!del) return;
        const id = del.getAttribute('data-del');
        XU.confirm('删除这条记录？', async () => {
          await XU.Store.del('money', id);
          XU.toast('已删除');
          render();
        }, true);
      });
    }
    render();
  });
})();
