/* panels/zodiac.js —— 星座：每日运势（按日期种子本地生成，每日自动更新，无需网络） */
(function () {
  const XU = window.XU;
  const KEY = 'zodiac_sign';

  const SIGNS = [
    { name: '白羊座', en: 'Aries', range: '3.21-4.19', emoji: '♈', el: '火象', lucky: ['红色', '白色'] },
    { name: '金牛座', en: 'Taurus', range: '4.20-5.20', emoji: '♉', el: '土象', lucky: ['绿色', '粉色'] },
    { name: '双子座', en: 'Gemini', range: '5.21-6.21', emoji: '♊', el: '风象', lucky: ['黄色', '蓝色'] },
    { name: '巨蟹座', en: 'Cancer', range: '6.22-7.22', emoji: '♋', el: '水象', lucky: ['银色', '白色'] },
    { name: '狮子座', en: 'Leo', range: '7.23-8.22', emoji: '♌', el: '火象', lucky: ['金色', '橙色'] },
    { name: '处女座', en: 'Virgo', range: '8.23-9.22', emoji: '♍', el: '土象', lucky: ['灰色', '米色'] },
    { name: '天秤座', en: 'Libra', range: '9.23-10.23', emoji: '♎', el: '风象', lucky: ['粉色', '蓝色'] },
    { name: '天蝎座', en: 'Scorpio', range: '10.24-11.22', emoji: '♏', el: '水象', lucky: ['黑色', '紫色'] },
    { name: '射手座', en: 'Sagittarius', range: '11.23-12.21', emoji: '♐', el: '火象', lucky: ['紫色', '蓝色'] },
    { name: '摩羯座', en: 'Capricorn', range: '12.22-1.19', emoji: '♑', el: '土象', lucky: ['棕色', '黑色'] },
    { name: '水瓶座', en: 'Aquarius', range: '1.20-2.18', emoji: '♒', el: '风象', lucky: ['蓝色', '青色'] },
    { name: '双鱼座', en: 'Pisces', range: '2.19-3.20', emoji: '♓', el: '水象', lucky: ['绿色', '紫色'] }
  ];

  // 按日期+星座生成确定性伪随机（每天变化，同一天内稳定）
  function seedOf(dateStr, idx) {
    let h = 0;
    const s = dateStr + '|' + idx;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }

  function horoscope(idx) {
    const rnd = mulberry(seedOf(XU.today(), idx));
    const total = 45 + Math.floor(rnd() * 56);
    const love = 45 + Math.floor(rnd() * 56);
    const work = 45 + Math.floor(rnd() * 56);
    const wealth = 45 + Math.floor(rnd() * 56);
    const stars = (score) => '★★★★☆'.slice(0, Math.round(score / 25)).padEnd(5, '☆');
    return {
      total, love, work, wealth,
      starsTotal: stars(total), starsLove: stars(love), starsWork: stars(work), starsWealth: stars(wealth),
      loveTxt: pick(rnd, [
        '单身者今天容易遇到聊得来的对象，主动一点会有惊喜。',
        '感情平稳，适合和伴侣好好吃顿饭，说说心里话。',
        '今天适合表达心意，把藏在心里的话说出来。',
        '与朋友相处愉快，身边人的支持让你很有安全感。',
        '感情上需要多一点耐心，慢一点反而更稳。'
      ]),
      workTxt: pick(rnd, [
        '工作上思路清晰，适合推进搁置已久的计划。',
        '团队协作顺利，你的建议容易被采纳。',
        '今天适合学习充电，新的技能马上能用上。',
        '保持专注，把手头的事一件件做完，效率很高。',
        '有贵人指点，遇到难题不妨主动求助。'
      ]),
      wealthTxt: pick(rnd, [
        '财运平稳，适合记账复盘，别做冲动消费。',
        '有意外小惊喜，但大额投资仍需谨慎。',
        '适合整理账单、规划预算，越理越有钱。',
        '赚钱机会藏在小事里，留意身边的信息。',
        '今天适合省钱，自己做饭比外卖划算。'
      ]),
      luckyNum: 1 + Math.floor(rnd() * 9),
      luckyColor: pick(rnd, ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '白色', '金色']),
      match: pick(rnd, ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座']),
      advice: pick(rnd, [
        '早睡早起，精神一整天。',
        '多喝水，让身体保持好状态。',
        '别把手机带进卧室，睡眠质量会更好。',
        '今天适合整理房间，环境清爽心情也清爽。',
        '给自己 25 分钟专注时间，收获会很大。',
        '运动半小时，让身体和大脑都活跃起来。'
      ])
    };
  }

  function signByDate(m, d) {
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 0;
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 1;
    if ((m === 5 && d >= 21) || (m === 6 && d <= 21)) return 2;
    if ((m === 6 && d >= 22) || (m === 7 && d <= 22)) return 3;
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 4;
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 5;
    if ((m === 9 && d >= 23) || (m === 10 && d <= 23)) return 6;
    if ((m === 10 && d >= 24) || (m === 11 && d <= 22)) return 7;
    if ((m === 11 && d >= 23) || (m === 12 && d <= 21)) return 8;
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 9;
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 10;
    return 11;
  }

  XU.regPanel('zodiac', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    let idx = null;
    try { const v = await XU.Store.kvGet(KEY); if (v != null && v >= 0 && v < 12) idx = v; } catch (e) {}
    if (idx == null) {
      const now = new Date();
      idx = signByDate(now.getMonth() + 1, now.getDate());
    }

    function scoreBar(label, score, stars, txt) {
      return '<div class="zo-row"><div class="zo-label">' + label + '</div>' +
        '<div class="zo-bar"><i style="width:' + score + '%"></i></div>' +
        '<div class="zo-stars">' + stars + '</div></div>' +
        (txt ? '<div class="zo-txt">' + txt + '</div>' : '');
    }

    function render() {
      const s = SIGNS[idx];
      const h = horoscope(idx);
      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">🔮 星座运势</h2><p style="margin:0;font-size:12.5px;opacity:.92">今日运势 · 每日自动更新</p></div>' +
        '<div class="card"><div class="zo-sign">' + s.emoji + ' ' + s.name + ' <span class="sub">' + s.en + ' · ' + s.range + ' · ' + s.el + '</span></div>' +
        '<div class="zo-total"><span class="zo-num">' + h.total + '</span><span class="sub">综合运势</span><span class="zo-stars big">' + h.starsTotal + '</span></div>' +
        scoreBar('爱情', h.love, h.starsLove, h.loveTxt) +
        scoreBar('事业', h.work, h.starsWork, h.workTxt) +
        scoreBar('财运', h.wealth, h.starsWealth, h.wealthTxt) +
        '<div class="zo-facts">' +
        '<div class="zo-fact"><b>幸运数字</b><span>' + h.luckyNum + '</span></div>' +
        '<div class="zo-fact"><b>幸运色</b><span>' + h.luckyColor + '</span></div>' +
        '<div class="zo-fact"><b>速配星座</b><span>' + h.match + '</span></div>' +
        '<div class="zo-fact"><b>今日建议</b><span>' + h.advice + '</span></div>' +
        '</div></div>' +
        '<div class="card"><h2>选择我的星座</h2><div class="zo-grid">' + SIGNS.map((x, i) =>
          '<button class="zo-chip' + (i === idx ? ' on' : '') + '" data-i="' + i + '">' + x.emoji + ' ' + x.name + '</button>').join('') + '</div></div>';

      XU.$$('.zo-chip', el).forEach((b) => b.onclick = async () => {
        idx = +b.getAttribute('data-i');
        await XU.Store.kvSet(KEY, idx);
        render();
      });
    }

    render();
  });
})();