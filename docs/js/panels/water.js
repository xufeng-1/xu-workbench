/* panels/water.js —— 喝水记录：每日打卡 + 目标进度 + 7日统计（本地存储） */
(function () {
  const XU = window.XU;
  const KEY = 'water_log';

  async function getData() {
    try { const r = await XU.Store.kvGet(KEY); if (r && r.days) return r; } catch (e) {}
    return { goal: 8, days: {} };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  XU.regPanel('water', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    const today = XU.today();

    function last7() {
      const out = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        out.push({ key: key, count: data.days[key] || 0, label: (i === 0 ? '今天' : String(d.getDate()) + '日') });
      }
      return out;
    }

    function render() {
      const cur = data.days[today] || 0;
      const goal = data.goal;
      const pct = Math.min(100, Math.round(cur / goal * 100));
      const r = 64, circ = 2 * Math.PI * r;
      const wk = last7();
      const max7 = Math.max(goal, ...wk.map((w) => w.count), 1);

      const cups = [];
      for (let i = 1; i <= goal; i++) {
        cups.push('<button class="wt-cup' + (i <= cur ? ' full' : '') + '" data-n="' + i + '">💧</button>');
      }

      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">💧 喝水打卡</h2><p style="margin:0;font-size:12.5px;opacity:.92">每天八杯水 · 健康好习惯</p></div>' +
        '<div class="card" style="display:flex;align-items:center;gap:16px">' +
        '<div style="position:relative;width:150px;height:150px;flex:0 0 auto">' +
        '<svg width="150" height="150" viewBox="0 0 150 150" style="transform:rotate(-90deg)">' +
        '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="rgba(139,123,216,.18)" stroke-width="12"/>' +
        '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="#7C6BD8" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ * (1 - pct / 100)) + '"/></svg>' +
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
        '<div style="font-size:30px;font-weight:800;color:var(--primary)">' + cur + '/' + goal + '</div>' +
        '<div style="font-size:12px;color:var(--muted)">杯 · ' + pct + '%</div></div></div>' +
        '<div class="grow"><div style="font-size:14px;font-weight:700;margin-bottom:6px">' +
        (pct >= 100 ? '🎉 目标达成，太棒了！' : pct >= 60 ? '💪 继续加油，快达标了！' : '🥤 记得多喝水哦～') + '</div>' +
        '<div class="sub">每杯约 250ml，建议每天 ' + goal + ' 杯</div>' +
        '<button class="btn ghost mini" id="wtGoal">调整目标</button></div></div>' +
        '<div class="card"><h2>今日打卡</h2><div class="wt-cups">' + cups.join('') + '</div>' +
        '<div class="sub" style="margin-top:8px">点击杯子记录一杯 · 再点取消</div></div>' +
        '<div class="card"><h2>近 7 天</h2><div style="display:flex;align-items:flex-end;gap:10px;height:120px;padding:6px 2px 0">' +
        wk.map((w) => '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">' +
          '<div style="font-size:11px;color:var(--muted);margin-bottom:2px">' + w.count + '</div>' +
          '<div style="width:70%;max-width:30px;height:' + Math.max(4, Math.round(w.count / max7 * 84)) + 'px;border-radius:8px 8px 3px 3px;background:' + (w.count >= goal ? 'linear-gradient(180deg,#8f7cf0,#6f5bd8)' : 'rgba(139,123,216,.35)') + '"></div>' +
          '<div style="font-size:11px;color:var(--muted);margin-top:4px">' + w.label + '</div></div>').join('') + '</div></div>';

      XU.$$('.wt-cup', el).forEach((b) => b.onclick = async () => {
        const n = parseInt(b.getAttribute('data-n'), 10);
        data.days[today] = (n <= cur ? n - 1 : n);
        await saveData(data); render();
      });
      XU.$('#wtGoal', el).onclick = () => {
        XU.modal(
          '<h3>🎯 调整每日目标</h3><div style="display:flex;flex-direction:column;gap:10px">' +
          '<input class="input" id="wtGoalIn" type="number" min="4" max="16" value="' + goal + '">' +
          '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" id="wtGoalSave">保存</button></div></div>',
          { onMount: (mask, close) => {
            XU.$('[data-x=no]', mask).onclick = close;
            XU.$('#wtGoalSave', mask).onclick = async () => {
              const g = parseInt(XU.$('#wtGoalIn', mask).value, 10);
              if (!g || g < 4 || g > 16) { XU.toast('请输入 4-16 之间的杯数'); return; }
              data.goal = g; await saveData(data); render(); close(); XU.toast('目标已更新');
            };
          } }
        );
      };
    }

    render();
  });
})();