/* panels/tools.js —— 工具箱：单位换算 / 汇率换算 / 健康计算 / 决策助手（随机工具） */
(function () {
  const XU = window.XU;
  const FX_KEY = 'fx_rates';

  /* ---------- 单位换算 ---------- */
  const UNITS = {
    length: { name: '长度', units: { 米: 1, 千米: 1000, 厘米: 0.01, 毫米: 0.001, 英寸: 0.0254, 英尺: 0.3048, 码: 0.9144, 英里: 1609.344, 海里: 1852 } },
    weight: { name: '重量', units: { 千克: 1, 克: 0.001, 毫克: 0.000001, 吨: 1000, 斤: 0.5, 两: 0.05, 磅: 0.45359237, 盎司: 0.028349523 } },
    area: { name: '面积', units: { 平方米: 1, 平方千米: 1000000, 公顷: 10000, 亩: 666.667, 平方英尺: 0.092903, 平方英寸: 0.00064516 } },
    volume: { name: '体积', units: { 升: 1, 毫升: 0.001, 立方米: 1000, '加仑(美)': 3.78541, '加仑(英)': 4.54609, 立方英尺: 28.3168 } },
    temp: { name: '温度', special: true, units: { 摄氏度: 'C', 华氏度: 'F', 开尔文: 'K' } },
    speed: { name: '速度', units: { '千米/小时': 1, '米/秒': 3.6, '英里/小时': 1.609344, '节': 1.852 } },
    data: { name: '数据', units: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 } },
    time: { name: '时间', units: { 秒: 1, 分钟: 60, 小时: 3600, 天: 86400, 周: 604800, 月: 2592000, 年: 31536000 } }
  };
  const UNIT_KEYS = Object.keys(UNITS);

  /* ---------- 汇率（内置基准 + 在线更新） ---------- */
  const FX_BASE = { CNY: 1, USD: 7.1, EUR: 7.8, JPY: 0.048, GBP: 9.0, HKD: 0.91, KRW: 0.0052, AUD: 4.7, CAD: 5.2, SGD: 5.3, THB: 0.2, RUB: 0.082 };
  const FX_NAMES = { CNY: '人民币', USD: '美元', EUR: '欧元', JPY: '日元', GBP: '英镑', HKD: '港币', KRW: '韩元', AUD: '澳元', CAD: '加元', SGD: '新加坡元', THB: '泰铢', RUB: '卢布' };

  async function getRates() {
    try {
      const c = await XU.Store.kvGet(FX_KEY);
      if (c && c.rates && c.ts && Date.now() - c.ts < 6 * 3600000) return c;
    } catch (e) {}
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      let res;
      try { res = await fetch('https://open.er-api.com/v6/latest/CNY', { signal: ctrl.signal }); }
      finally { clearTimeout(timer); }
      if (res.ok) {
        const d = await res.json();
        if (d && d.result === 'success' && d.rates) {
          const rates = {};
          Object.keys(FX_BASE).forEach((k) => { rates[k] = d.rates[k] || FX_BASE[k]; });
          const c = { rates, ts: Date.now(), src: '在线' };
          try { await XU.Store.kvSet(FX_KEY, c); } catch (e) {}
          return c;
        }
      }
    } catch (e) {}
    return { rates: FX_BASE, ts: Date.now(), src: '内置' };
  }

  /* ---------- 健康计算 ---------- */
  function calcHealth(h, w, age, gender, activity) {
    const hM = h / 100;
    const bmi = w / (hM * hM);
    const isMale = gender === 'male';
    const bmr = isMale ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
    const tdee = bmr * activity;
    const ideal = isMale ? 50 + 0.91 * (h - 152.4) : 45.5 + 0.91 * (h - 152.4);
    const water = w * 33;
    let bmiTxt = '', bmiCls = '';
    if (bmi < 18.5) { bmiTxt = '偏瘦'; bmiCls = 'thin'; }
    else if (bmi < 24) { bmiTxt = '正常'; bmiCls = 'ok'; }
    else if (bmi < 28) { bmiTxt = '超重'; bmiCls = 'warn'; }
    else { bmiTxt = '肥胖'; bmiCls = 'fat'; }
    return { bmi, bmiTxt, bmiCls, bmr, tdee, ideal, water };
  }

  /* ---------- 决策助手 ---------- */
  function decide(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1103515245 + 12345) >>> 0;
      return s / 4294967296;
    };
  }

  XU.regPanel('tools', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);
    let tab = 'unit';

    const TABS = [['unit', '单位换算'], ['fx', '汇率换算'], ['health', '健康计算'], ['decide', '决策助手']];

    function seg() {
      return '<div class="seg" id="toolTabs">' + TABS.map((t) =>
        '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>';
    }

    function renderUnit() {
      const cat = UNIT_KEYS.find((k) => UNITS[k].name === unitCat) || 'length';
      const u = UNITS[cat];
      const keys = Object.keys(u.units);
      const special = u.special;
      function conv(v, from, to) {
        if (special) {
          const toC = (x, u2) => u2 === 'C' ? x : u2 === 'F' ? (x - 32) * 5 / 9 : x - 273.15;
          const fromC = (x, u2) => u2 === 'C' ? x : u2 === 'F' ? x * 9 / 5 + 32 : x + 273.15;
          return fromC(toC(v, from), to);
        }
        return v * u.units[from] / u.units[to];
      }
      function opts(sel) {
        return keys.map((k) => '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + k + '</option>').join('');
      }
      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">🧰 工具箱</h2><p style="margin:0;font-size:12.5px;opacity:.92">常用工具 · 全部免费</p></div>' +
        '<div class="card">' + seg() +
          '<div class="tool-body">' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px" id="unitCats">' + UNIT_KEYS.map((k) =>
            '<button class="chip' + (k === cat ? ' on' : '') + '" data-cat="' + k + '">' + UNITS[k].name + '</button>').join('') + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px">' +
          '<div class="grid2"><label class="sub" style="margin:0">输入</label><label class="sub" style="margin:0">结果</label></div>' +
          '<div class="grid2">' +
            '<input class="input" id="uVal" type="number" placeholder="数值" value="1">' +
            '<input class="input" id="uRes" readonly placeholder="结果">' +
          '</div>' +
          '<div class="grid2">' +
            '<select class="input" id="uFrom">' + opts(keys[0]) + '</select>' +
            '<select class="input" id="uTo">' + opts(keys[1] || keys[0]) + '</select>' +
          '</div>' +
          '</div></div>' +
        '</div>';

      function upd() {
        const v = parseFloat(XU.$('#uVal', el).value);
        const from = XU.$('#uFrom', el).value;
        const to = XU.$('#uTo', el).value;
        if (isNaN(v)) { XU.$('#uRes', el).value = ''; return; }
        const r = conv(v, from, to);
        XU.$('#uRes', el).value = (special ? Math.round(r * 100) / 100 : parseFloat(r.toPrecision(8))) + '';
      }
      XU.$('#uVal', el).addEventListener('input', upd);
      XU.$('#uFrom', el).addEventListener('change', upd);
      XU.$('#uTo', el).addEventListener('change', upd);
      XU.$$('#unitCats .chip', el).forEach((b) => b.onclick = () => { unitCat = b.getAttribute('data-cat'); renderUnit(); });
      upd();
    }

    async function renderFx() {
      const fx = await getRates();
      const codes = Object.keys(FX_BASE);
      function opts(sel) {
        return codes.map((k) => '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + k + ' ' + FX_NAMES[k] + '</option>').join('');
      }
      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">🧰 工具箱</h2><p style="margin:0;font-size:12.5px;opacity:.92">常用工具 · 全部免费</p></div>' +
        '<div class="card">' + seg() +
          '<div class="tool-body">' +
          '<p class="sub">汇率基准：人民币 (CNY) · ' + (fx.src === '在线' ? '数据来自在线接口，每 6 小时自动刷新' : '当前为内置汇率（离线模式）') + '</p>' +
          '<div class="grid2">' +
            '<label class="sub" style="margin:0">金额</label><label class="sub" style="margin:0">结果</label>' +
          '</div>' +
          '<div class="grid2">' +
            '<input class="input" id="fxVal" type="number" placeholder="金额" value="100">' +
            '<input class="input" id="fxRes" readonly placeholder="结果">' +
          '</div>' +
          '<div class="grid2">' +
            '<select class="input" id="fxFrom">' + opts('CNY') + '</select>' +
            '<select class="input" id="fxTo">' + opts('USD') + '</select>' +
          '</div>' +
          '<button class="btn ghost" id="fxRefresh" style="margin-top:10px">🔄 刷新汇率</button>' +
          '</div></div>' +
        '<div class="card"><h2>💡 说明</h2><p class="sub">汇率每日变动，在线接口获取失败时自动使用内置参考汇率，仅供参考。</p></div>';

      function upd() {
        const v = parseFloat(XU.$('#fxVal', el).value);
        const from = XU.$('#fxFrom', el).value;
        const to = XU.$('#fxTo', el).value;
        if (isNaN(v)) { XU.$('#fxRes', el).value = ''; return; }
        const r = v * fx.rates[from] / fx.rates[to];
        XU.$('#fxRes', el).value = (Math.round(r * 100) / 100) + ' ' + to;
      }
      XU.$('#fxVal', el).addEventListener('input', upd);
      XU.$('#fxFrom', el).addEventListener('change', upd);
      XU.$('#fxTo', el).addEventListener('change', upd);
      XU.$('#fxRefresh', el).onclick = async () => {
        try {
          await XU.Store.kvDel(FX_KEY);
          const c = await getRates();
          XU.toast('汇率已刷新（' + c.src + '）'); renderFx();
        } catch (e) { XU.toast('刷新失败'); }
      };
      upd();
    }

    function renderHealth() {
      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">🧰 工具箱</h2><p style="margin:0;font-size:12.5px;opacity:.92">常用工具 · 全部免费</p></div>' +
        '<div class="card">' + seg() +
          '<div class="tool-body">' +
          '<div class="grid2">' +
            '<div><label class="sub" style="margin:0 0 4px;display:block">身高 (cm)</label><input class="input" id="hH" type="number" value="170"></div>' +
            '<div><label class="sub" style="margin:0 0 4px;display:block">体重 (kg)</label><input class="input" id="hW" type="number" value="65"></div>' +
          '</div>' +
          '<div class="grid2" style="margin-top:10px">' +
            '<div><label class="sub" style="margin:0 0 4px;display:block">年龄</label><input class="input" id="hA" type="number" value="28"></div>' +
            '<div><label class="sub" style="margin:0 0 4px;display:block">性别</label><select class="input" id="hG"><option value="male">男</option><option value="female" selected>女</option></select></div>' +
          '</div>' +
          '<div style="margin-top:10px"><label class="sub" style="margin:0 0 4px;display:block">活动强度</label>' +
          '<select class="input" id="hAct">' +
            '<option value="1.2">久坐（基本不运动）</option>' +
            '<option value="1.375" selected>轻度（每周1-3次）</option>' +
            '<option value="1.55">中度（每周3-5次）</option>' +
            '<option value="1.725">高度（每周6-7次）</option>' +
            '<option value="1.9">极高（体力工作+训练）</option>' +
          '</select></div>' +
          '<button class="btn" id="hCalc" style="width:100%;margin-top:12px">计算</button>' +
          '<div id="hRes" style="margin-top:14px"></div>' +
          '</div></div>' +
        '<div class="card"><h2>💡 说明</h2><p class="sub">BMI、基础代谢（Mifflin-St Jeor 公式）、每日总消耗与理想体重仅为估算，请结合专业意见。</p></div>';

      XU.$('#hCalc', el).onclick = () => {
        const h = parseFloat(XU.$('#hH', el).value);
        const w = parseFloat(XU.$('#hW', el).value);
        const age = parseFloat(XU.$('#hA', el).value);
        const gender = XU.$('#hG', el).value;
        const act = parseFloat(XU.$('#hAct', el).value);
        if (!h || !w || !age || h < 50 || h > 250 || w < 10 || w > 400) { XU.toast('请输入合理的身高体重'); return; }
        const r = calcHealth(h, w, age, gender, act);
        XU.$('#hRes', el).innerHTML =
          '<div class="h-metrics">' +
          '<div class="h-metric"><span class="h-num">' + r.bmi.toFixed(1) + '</span><span class="h-lab">BMI</span><span class="chip ' + r.bmiCls + '">' + r.bmiTxt + '</span></div>' +
          '<div class="h-metric"><span class="h-num">' + Math.round(r.bmr) + '</span><span class="h-lab">基础代谢 大卡/天</span></div>' +
          '<div class="h-metric"><span class="h-num">' + Math.round(r.tdee) + '</span><span class="h-lab">每日总消耗 大卡</span></div>' +
          '<div class="h-metric"><span class="h-num">' + r.ideal.toFixed(1) + '</span><span class="h-lab">理想体重 kg</span></div>' +
          '<div class="h-metric"><span class="h-num">' + Math.round(r.water) + 'ml</span><span class="h-lab">每日建议饮水</span></div>' +
          '</div>';
      };
    }

    function renderDecide() {
      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">🧰 工具箱</h2><p style="margin:0;font-size:12.5px;opacity:.92">常用工具 · 全部免费</p></div>' +
        '<div class="card">' + seg() +
          '<div class="tool-body">' +
          '<div class="grid2">' +
            '<button class="btn" id="dCoin" style="height:64px;font-size:15px">🪙 抛硬币</button>' +
            '<button class="btn" id="dDice" style="height:64px;font-size:15px">🎲 掷骰子</button>' +
          '</div>' +
          '<div class="grid2" style="margin-top:10px">' +
            '<button class="btn" id="dNum" style="height:64px;font-size:15px">🔢 随机数字</button>' +
            '<button class="btn" id="dPick" style="height:64px;font-size:15px">🎯 随机选择</button>' +
          '</div>' +
          '<div class="d-result" id="dRes">点击上方按钮试试</div>' +
          '<textarea class="input" id="dOpts" rows="3" placeholder="随机选择：每行一个选项，如：&#10;火锅&#10;烤肉&#10;日料" style="margin-top:10px"></textarea>' +
          '</div></div>';

      function show(txt) {
        const r = XU.$('#dRes', el);
        r.textContent = txt;
        r.classList.remove('anim'); void r.offsetWidth; r.classList.add('anim');
      }
      XU.$('#dCoin', el).onclick = () => {
        const rnd = decide(Date.now());
        show(rnd() < 0.5 ? '正面 🪙' : '反面 🪙');
      };
      XU.$('#dDice', el).onclick = () => show('🎲 ' + (1 + Math.floor(decide(Date.now())() * 6)));
      XU.$('#dNum', el).onclick = () => show('🔢 ' + (1 + Math.floor(decide(Date.now())() * 100)));
      XU.$('#dPick', el).onclick = () => {
        const opts = XU.$('#dOpts', el).value.split('\n').map((s) => s.trim()).filter(Boolean);
        if (!opts.length) { XU.toast('请先填写选项（每行一个）'); return; }
        show('🎯 就选它：' + opts[Math.floor(decide(Date.now())() * opts.length)]);
      };
    }

    let unitCat = 'length';
    function render() {
      if (tab === 'unit') renderUnit();
      else if (tab === 'fx') renderFx();
      else if (tab === 'health') renderHealth();
      else renderDecide();
      const tabs = XU.$('#toolTabs', el);
      if (tabs) tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-t]');
        if (b) { tab = b.getAttribute('data-t'); render(); }
      });
    }

    render();
  });
})();