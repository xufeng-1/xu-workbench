/* panels/almanac.js —— 黄历：农历、干支、宜忌、节日节气（lunar-javascript 本地计算，无需网络） */
(function () {
  const XU = window.XU;

  XU.regPanel('almanac', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    if (!window.Lunar || !window.Solar) {
      el.innerHTML = '<div class="card"><h2>黄历</h2><p class="sub">农历组件加载失败，请刷新页面重试。</p></div>';
      return;
    }

    let cur = new Date();
    cur.setHours(0, 0, 0, 0);

    function render() {
      const solar = window.Solar.fromDate(cur);
      const lunar = solar.getLunar();
      const gz = lunar.getYearInGanZhiByLiChun() + '年 ' + lunar.getMonthInGanZhi() + '月 ' + lunar.getDayInGanZhi() + '日';
      const yi = lunar.getDayYi() || [];
      const ji = lunar.getDayJi() || [];
      const festivals = lunar.getFestivals() || [];
      const jieqi = lunar.getJieQi() || '';

      const w = ['日', '一', '二', '三', '四', '五', '六'][cur.getDay()];
      const ymd = cur.getFullYear() + '年' + (cur.getMonth() + 1) + '月' + cur.getDate() + '日';
      const isToday = cur.toDateString() === new Date().toDateString();

      function tagList(arr, cls) {
        if (!arr.length) return '<div class="al-none">今日无特别' + (cls === 'yi' ? '宜' : '忌') + '</div>';
        return '<div class="al-tags ' + cls + '">' + arr.map((t) => '<span>' + t + '</span>').join('') + '</div>';
      }

      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">📜 黄历</h2><p style="margin:0;font-size:12.5px;opacity:.92">农历宜忌 · 节气节日 · 本地计算</p></div>' +
        '<div class="card al-main">' +
          '<div class="al-date">' + ymd + ' 星期' + w + (isToday ? ' <span class="chip">今天</span>' : '') + '</div>' +
          '<div class="al-lunar">' + lunar.toString() + '</div>' +
          '<div class="al-gz">' + gz + '</div>' +
          (jieqi ? '<div class="al-jq">⛅ 节气：' + jieqi + '</div>' : '') +
          (festivals.length ? '<div class="al-jq">🎉 节日：' + festivals.join('、') + '</div>' : '') +
        '</div>' +
        '<div class="grid2" style="align-items:stretch">' +
          '<div class="card al-yi"><h2 style="color:#5FC98C">✅ 今日宜</h2>' + tagList(yi, 'yi') + '</div>' +
          '<div class="card al-ji"><h2 style="color:#E07A7A">🚫 今日忌</h2>' + tagList(ji, 'ji') + '</div>' +
        '</div>' +
        '<div class="card"><div style="display:flex;gap:8px;justify-content:center">' +
          '<button class="btn mini ghost" id="alPrev">‹ 前一天</button>' +
          '<button class="btn mini" id="alToday">今天</button>' +
          '<button class="btn mini ghost" id="alNext">后一天 ›</button>' +
        '</div></div>';

      XU.$('#alPrev', el).onclick = () => { cur = new Date(cur.getTime() - 86400000); render(); };
      XU.$('#alNext', el).onclick = () => { cur = new Date(cur.getTime() + 86400000); render(); };
      XU.$('#alToday', el).onclick = () => { cur = new Date(); cur.setHours(0, 0, 0, 0); render(); };
    }

    render();
  });
})();