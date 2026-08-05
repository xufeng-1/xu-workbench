/* panels/mood.js —— 心情：每日情绪打卡 + 心情曲线 + 暖心鼓励 */
(function () {
  const XU = window.XU;

  const MOODS = [
    { emoji: '😄', label: '开心', level: 5 },
    { emoji: '🙂', label: '不错', level: 4 },
    { emoji: '😐', label: '一般', level: 3 },
    { emoji: '😔', label: '低落', level: 2 },
    { emoji: '😢', label: '难过', level: 1 }
  ];
  const ENCOURAGE = {
    5: '状态满分，继续保持这份能量，你会感染身边的人 ✨',
    4: '还不错！今天也给自己一点掌声 👏',
    3: '平常心也是好状态，先喝杯水，慢慢来 🌿',
    2: '累了就休息，低谷只是上坡路的开始 💪',
    1: '允许自己难过一会儿，你已经很努力了，抱抱自己 🤗'
  };
  const STORE_KEY = 'mood';

  async function getData() {
    const rec = await XU.Store.kvGet(STORE_KEY);
    return rec && rec.dates ? rec : { dates: {} };
  }

  function dayOf(d) {
    const p = d.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]).getDay();
  }
  function weekdayShort(d) {
    return '日一二三四五六'[dayOf(d)];
  }
  function fmtDay(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }

  XU.regPanel('mood', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    const today = XU.today();
    const todayRec = data.dates[today] || {};

    el.innerHTML =
      '<div class="card">' +
        '<h2>🌸 今日心情</h2>' +
        '<p class="sub">每天记录一下，情绪被看见就会好一半</p>' +
        '<div class="mood-picker" id="moodPicker">' +
          MOODS.map((m) => '<button class="mood-btn' + (todayRec.level === m.level ? ' on' : '') + '" data-level="' + m.level + '"><span>' + m.emoji + '</span><i>' + m.label + '</i></button>').join('') +
        '</div>' +
        '<input type="text" id="moodNote" maxlength="60" placeholder="今天想记点什么？（可选）" value="' + XU.esc(todayRec.note || '') + '">' +
        '<div class="actions"><button class="btn ghost" id="moodClear">清除今日</button><button class="btn" id="moodSave">保存心情</button></div>' +
        '<p class="mood-quote" id="moodQuote"></p>' +
      '</div>' +
      '<div class="card">' +
        '<h2>📈 最近 14 天心情曲线</h2>' +
        '<p class="sub" id="moodSummary"></p>' +
        '<div class="mood-chart" id="moodChart"></div>' +
      '</div>';

    const quoteEl = XU.$('#moodQuote', el);
    function renderQuote() {
      const lvl = currentLevel();
      quoteEl.textContent = lvl ? ENCOURAGE[lvl] : '选一个今天的心情，送自己一句鼓励 ✨';
    }

    let selected = todayRec.level || 0;
    function currentLevel() { return selected; }

    XU.$('#moodPicker', el).addEventListener('click', (e) => {
      const b = e.target.closest('.mood-btn');
      if (!b) return;
      selected = parseInt(b.getAttribute('data-level'), 10);
      XU.$$('.mood-btn', el).forEach((x) => x.classList.toggle('on', x.getAttribute('data-level') === String(selected)));
      renderQuote();
    });

    XU.$('#moodSave', el).onclick = async () => {
      if (!selected) { XU.toast('先选一个心情表情哦'); return; }
      const note = XU.$('#moodNote', el).value.trim();
      data.dates[today] = { level: selected, note: note, time: XU.now() };
      await XU.Store.kvSet(STORE_KEY, data);
      renderChart();
      renderQuote();
      XU.toast('心情已记录 🌸');
    };
    XU.$('#moodClear', el).onclick = async () => {
      delete data.dates[today];
      await XU.Store.kvSet(STORE_KEY, data);
      selected = 0;
      XU.$('#moodNote', el).value = '';
      XU.$$('.mood-btn', el).forEach((x) => x.classList.remove('on'));
      renderChart();
      renderQuote();
      XU.toast('已清除今日记录');
    };

    function renderChart() {
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({ key: key, rec: data.dates[key] });
      }
      const chartEl = XU.$('#moodChart', el);
      chartEl.innerHTML = days.map((d) => {
        const lvl = d.rec ? d.rec.level : 0;
        const emoji = d.rec ? MOODS.find((m) => m.level === lvl).emoji : '';
        const h = lvl ? Math.round((lvl / 5) * 64) + 8 : 6;
        const col = lvl ? 'var(--primary)' : 'var(--primary-soft)';
        return '<div class="mood-day">' +
          '<div class="mood-bar-wrap"><div class="mood-bar" style="height:' + h + 'px;background:' + col + '" title="' + (d.rec ? d.rec.note || '' : '') + '"></div></div>' +
          '<div class="mood-emoji">' + (emoji || '·') + '</div>' +
          '<div class="mood-wd">' + (d.key === today ? '今天' : weekdayShort(d.key)) + '</div>' +
        '</div>';
      }).join('');

      const keys = days.map((d) => d.key).filter((k) => data.dates[k]);
      if (keys.length) {
        const sum = keys.reduce((s, k) => s + data.dates[k].level, 0);
        const avg = (sum / keys.length).toFixed(1);
        const best = keys.reduce((a, b) => (data.dates[a].level > data.dates[b].level ? a : b));
        const bestEmoji = MOODS.find((m) => m.level === data.dates[best].level).emoji;
        XU.$('#moodSummary', el).textContent = '记录 ' + keys.length + ' 天 · 平均心情指数 ' + avg + ' · 最开心的一天是 ' + best + ' ' + bestEmoji;
      } else {
        XU.$('#moodSummary', el).textContent = '还没有记录，从今天开始打卡吧';
      }
    }
    renderChart();
    renderQuote();
  });
})();
