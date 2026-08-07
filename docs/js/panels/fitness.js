/* panels/fitness.js —— 健身：身高体重 / 计时器 / 训练视频 */
(function () {
  const XU = window.XU;

  const PARTS = [
    { id: 'fatburn', label: '燃脂' },
    { id: 'strength', label: '增肌' },
    { id: 'shape', label: '塑形' },
    { id: 'core', label: '体能' },
    { id: 'stretch', label: '柔韧' },
    { id: 'cardio', label: '有氧' }
  ];

  async function records() {
    const all = await XU.Store.all('fitness');
    return all.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  function weightChart(recs) {
    const r = recs.slice(0, 14).reverse().filter((x) => x.weight);
    if (r.length < 2) return '';
    const w = 300, h = 110, pad = 8;
    const min = Math.min.apply(null, r.map((x) => x.weight)) - 1;
    const max = Math.max.apply(null, r.map((x) => x.weight)) + 1;
    const px = (i) => pad + (i * (w - pad * 2)) / (r.length - 1);
    const py = (v) => h - pad - ((v - min) * (h - pad * 2)) / (max - min);
    let path = r.map((x, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(x.weight).toFixed(1)).join(' ');
    let dots = r.map((x, i) => '<circle cx="' + px(i).toFixed(1) + '" cy="' + py(x.weight).toFixed(1) + '" r="3" fill="#7C6BD4"><title>' + x.date + ' ' + x.weight + 'kg</title></circle>').join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto">' +
      '<path d="' + path + '" fill="none" stroke="#9A8BDF" stroke-width="2.5" stroke-linecap="round"/>' + dots + '</svg>';
  }

  function bodyRecordCard(recs, rerender) {
    const latest = recs[0];
    const prev = recs[1];
    const diffW = latest && prev && latest.weight && prev.weight ? latest.weight - prev.weight : null;
    const diffH = latest && prev && latest.height && prev.height ? latest.height - prev.height : null;
    const delta = (v) => {
      if (v == null) return '<span class="chip">—</span>';
      if (Math.abs(v) < 0.01) return '<span class="chip">持平</span>';
      return v > 0 ? '<span class="chip" style="background:#FBE9E9;color:var(--danger)">▲ +' + v.toFixed(1) + '</span>' : '<span class="chip" style="background:#E7F6EC;color:var(--ok)">▼ ' + v.toFixed(1) + '</span>';
    };
    return '<div class="card">' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<h2>📏 身高体重</h2>' +
        '<button class="btn mini" id="addFitness">+ 记录</button>' +
      '</div>' +
      '<p class="sub">每日记录，自动对比变化（最近 ' + (recs[0] ? recs[0].date : '—') + '）</p>' +
      (latest
        ? '<div class="grid3">' +
            '<div class="stat-card"><div class="num">' + (latest.height || '—') + '</div><div class="lab">身高 cm ' + delta(diffH) + '</div></div>' +
            '<div class="stat-card"><div class="num">' + (latest.weight || '—') + '</div><div class="lab">体重 kg</div></div>' +
            '<div class="stat-card"><div class="num" style="font-size:14px">' + delta(diffW) + '</div><div class="lab">较上次</div></div>' +
          '</div>' +
          (recs.length > 1 ? weightChart(recs) + '<div class="updated">近14次体重趋势</div>' : '')
        : '<div class="empty">还没有记录，点「+ 记录」开始</div>') +
      '<div style="margin-top:8px"><details><summary style="color:var(--muted);font-size:12.5px;cursor:pointer">查看历史记录</summary>' +
      '<table class="tbl"><tr><th>日期</th><th>身高</th><th>体重</th></tr>' +
      recs.map((r) => '<tr><td>' + r.date + '</td><td>' + (r.height || '—') + ' cm</td><td>' + (r.weight || '—') + ' kg</td></tr>').join('') +
      '</table></details></div></div>';

    function addModal() {
      XU.modal(
        '<h3>记录身高体重</h3>' +
        '<label class="lbl">日期</label><input type="date" id="fDate" value="' + XU.today() + '">' +
        '<label class="lbl">身高（cm）</label><input type="number" id="fH" placeholder="如 175" step="0.5">' +
        '<label class="lbl">体重（kg）</label><input type="number" id="fW" placeholder="如 65.5" step="0.1">' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">保存</button></div>',
        { onMount: (mask, close) => {
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const date = XU.$('#fDate', mask).value || XU.today();
            const h = parseFloat(XU.$('#fH', mask).value);
            const w = parseFloat(XU.$('#fW', mask).value);
            if (!h && !w) { XU.toast('至少填一项'); return; }
            const old = await XU.Store.get('fitness', date);
            await XU.Store.set('fitness', { id: date, date, height: h || (old && old.height), weight: w || (old && old.weight) });
            close(); rerender(); XU.toast('已记录 ✔');
          };
        } }
      );
    }
    // 绑定
    setTimeout(() => { const b = XU.$('#addFitness', document); if (b) b.onclick = addModal; }, 0);
  }

  function timerCard() {
    let seconds = 0, target = 0, timer = null, running = false;
    const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<h2>⏱️ 健身计时器</h2><p class="sub">定时训练，完成后自动计入今日运动打卡</p>' +
      '<div class="seg" id="timerPresets">' +
        '<button data-min="15">15分</button><button data-min="30">30分</button>' +
        '<button data-min="45">45分</button><button data-min="60">60分</button><button data-min="0">自由</button>' +
      '</div>' +
      '<div class="timer-ring" id="ring"><div class="timer-num" id="timerNum">00:00</div></div>' +
      '<div style="display:flex;gap:10px;justify-content:center">' +
        '<button class="btn" id="tStart">▶ 开始</button>' +
        '<button class="btn ghost" id="tPause">⏸ 暂停</button>' +
        '<button class="btn ghost" id="tReset">↺ 重置</button>' +
      '</div>' +
      '<p style="text-align:center;color:var(--muted);font-size:12.5px;margin:10px 0 0" id="timerHint">选择时长后开始</p>';

    const numEl = XU.$('#timerNum', card);
    const ring = XU.$('#ring', card);
    const hint = XU.$('#timerHint', card);

    function draw() {
      numEl.textContent = fmt(seconds);
      const pct = target ? Math.min(100, (seconds / target) * 100) : 0;
      ring.style.background = 'conic-gradient(var(--primary) ' + pct + '%, var(--primary-soft) ' + pct + '%)';
    }
    function stopTicker() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      if (running) return;
      running = true;
      stopTicker();
      timer = setInterval(() => {
        seconds++;
        if (target && seconds >= target) {
          seconds = target;
          draw();
          finish();
        } else draw();
      }, 1000);
    }
    function pause() { running = false; stopTicker(); }
    function reset() { running = false; stopTicker(); seconds = 0; draw(); }
    function finish() {
      pause();
      const mins = Math.max(1, Math.round(seconds / 60));
      XU.Store.get('workouts', XU.today()).then((r) =>
        XU.Store.set('workouts', { id: XU.today(), date: XU.today(), minutes: (r ? r.minutes : 0) + mins })
      );
      hint.textContent = '🎉 训练完成！已自动计入运动打卡 ' + mins + ' 分钟';
      XU.toast('训练完成，打卡 +' + mins + ' 分钟 🎉');
      navigator.vibrate && navigator.vibrate([200, 100, 200]);
    }

    XU.$('#timerPresets', card).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      target = parseInt(b.getAttribute('data-min'), 10) * 60;
      reset();
      hint.textContent = target ? '目标 ' + b.textContent + '，点「开始」' : '自由计时，点「开始」';
    });
    XU.$('#tStart', card).onclick = () => { start(); hint.textContent = '训练中…'; };
    XU.$('#tPause', card).onclick = () => { pause(); hint.textContent = '已暂停'; };
    XU.$('#tReset', card).onclick = () => { reset(); hint.textContent = target ? '已重置' : '已重置'; };
    return card;
  }

  async function videoCard(partId) {
    const data = await XU.feed('fitnessVideos').catch(() => ({}));
    const videos = ((data.parts || {})[partId] || []).filter((v) => v && v.title);
    if (!videos.length) return '<div class="empty">今日该部位视频更新中，稍后再来看看～</div>';
    return '<div class="list">' + videos.map((v) => XU.videoCard(v)).join('') + '</div>';
  }

  /* ===== 健身计划生成（输入部位 → 自动排周）===== */
  const PLAN_PARTS = [
    { id: 'chest', label: '胸部' },
    { id: 'back', label: '背部' },
    { id: 'legs', label: '腿部' },
    { id: 'shoulders', label: '肩部' },
    { id: 'arms', label: '手臂' },
    { id: 'core', label: '核心' },
    { id: 'full', label: '全身' }
  ];
  const PLAN_GOALS = [
    { id: 'muscle', label: '增肌' },
    { id: 'shape', label: '塑形' },
    { id: 'fatburn', label: '减脂' },
    { id: 'stamina', label: '体能' }
  ];
  const EX = {
    chest: [
      { n: '俯卧撑', s: 4, r: '12-15 次', d: '双手略宽于肩，核心收紧，胸部发力推起' },
      { n: '上斜俯卧撑', s: 3, r: '10-12 次', d: '手撑床沿/椅子，侧重上胸' },
      { n: '钻石俯卧撑', s: 3, r: '8-10 次', d: '双手靠拢成菱形，练胸中缝' },
      { n: '宽距俯卧撑', s: 3, r: '10-12 次', d: '双手 1.5 倍肩宽，刺激胸大肌外侧' },
      { n: '弹力带夹胸', s: 3, r: '12-15 次', d: '弹力带固定身后，双臂向前夹拢' },
      { n: '俯卧撑+拍手', s: 3, r: '6-8 次', d: '进阶爆发力动作，量力而行' }
    ],
    back: [
      { n: '超人式', s: 4, r: '12-15 次', d: '俯卧同时抬手臂抬腿，背部夹紧' },
      { n: '俯身划船（水瓶）', s: 4, r: '12-15 次', d: '手持水瓶俯身，向后划拉夹背' },
      { n: '弹力带划船', s: 4, r: '12-15 次', d: '坐姿拉弹力带至腹部，挺胸收肩' },
      { n: '反向飞鸟', s: 3, r: '12-15 次', d: '俯身向两侧打开手臂，练上背' },
      { n: '小燕飞', s: 3, r: '10-12 次', d: '俯卧两头起，练下背竖脊肌' },
      { n: '引体向上（退阶）', s: 3, r: '5-8 次', d: '跳起后缓慢下放，或挂杆悬垂' }
    ],
    legs: [
      { n: '深蹲', s: 4, r: '12-15 次', d: '双脚与肩同宽，臀部向后坐，膝盖对准脚尖' },
      { n: '箭步蹲', s: 3, r: '每侧 10-12 次', d: '前后跨步下蹲，重心保持中间' },
      { n: '臀桥', s: 4, r: '15-20 次', d: '仰卧屈膝顶髋，顶端停顿 1 秒' },
      { n: '保加利亚分腿蹲', s: 3, r: '每侧 8-10 次', d: '后脚搭椅面，单腿下蹲' },
      { n: '靠墙静蹲', s: 3, r: '30-45 秒', d: '背贴墙，大腿平行地面' },
      { n: '提踵', s: 4, r: '20-25 次', d: '踮脚尖练小腿，顶端停顿' }
    ],
    shoulders: [
      { n: '水瓶推举', s: 4, r: '10-12 次', d: '手持水瓶上推至头顶，控制下放' },
      { n: '侧平举', s: 4, r: '12-15 次', d: '手臂向两侧抬起至水平，练中束' },
      { n: '前平举', s: 3, r: '12-15 次', d: '向前抬起至水平，练前束' },
      { n: '俯身飞鸟', s: 3, r: '12-15 次', d: '俯身向两侧打开，练后束' },
      { n: '阿诺德推举', s: 3, r: '10-12 次', d: '旋转式上推，全面刺激肩部' },
      { n: '耸肩', s: 3, r: '15-20 次', d: '耸肩停顿 1 秒，练斜方肌' }
    ],
    arms: [
      { n: '窄距俯卧撑', s: 4, r: '10-12 次', d: '双手窄于肩，练肱三头肌' },
      { n: '水瓶弯举', s: 4, r: '12-15 次', d: '大臂固定，屈肘弯举，练肱二头肌' },
      { n: '板凳臂屈伸', s: 3, r: '10-12 次', d: '双手撑椅，屈肘下放，练三头' },
      { n: '锤式弯举', s: 3, r: '12-15 次', d: '掌心相对弯举，练肱肌' },
      { n: '过头臂屈伸', s: 3, r: '10-12 次', d: '单手托水瓶举过头顶，向后屈伸' },
      { n: '反手划船（水瓶）', s: 3, r: '12-15 次', d: '掌心朝上划拉，练前臂与二头' }
    ],
    core: [
      { n: '平板支撑', s: 4, r: '30-60 秒', d: '肘撑地，身体成一条直线，不塌腰' },
      { n: '卷腹', s: 4, r: '15-20 次', d: '下背贴地，上腹卷起' },
      { n: '俄罗斯转体', s: 3, r: '每侧 15 次', d: '坐姿转体，可手持水瓶' },
      { n: '登山跑', s: 3, r: '30 秒', d: '平板姿势交替提膝，越快越好' },
      { n: '仰卧抬腿', s: 3, r: '12-15 次', d: '下腹发力抬腿，缓慢下放' },
      { n: '侧平板支撑', s: 3, r: '每侧 25-40 秒', d: '侧肘撑地，身体一条直线' }
    ],
    full: [
      { n: '开合跳', s: 3, r: '30-40 次', d: '热身+全身燃脂，手脚同步打开' },
      { n: '深蹲', s: 4, r: '12-15 次', d: '全身大肌群动作，动作标准优先' },
      { n: '俯卧撑', s: 4, r: '10-12 次', d: '上肢推类动作' },
      { n: '臀桥', s: 3, r: '15 次', d: '臀部与核心协同发力' },
      { n: '高抬腿', s: 3, r: '30 秒', d: '原地高抬腿，心肺燃脂' },
      { n: '波比跳（退阶）', s: 3, r: '8-10 次', d: '下蹲-撑地-站起，全身参与' }
    ]
  };
  const CARDIO = [
    { n: '快走', s: 1, r: '30-40 分钟', d: '微微出汗即可，保持能说话的速度' },
    { n: '慢跑/跳绳', s: 1, r: '20-30 分钟', d: '间歇法：快 1 分钟 + 慢 1 分钟循环' },
    { n: '开合跳+高抬腿', s: 4, r: '40 秒 × 2', d: '每组间休息 30 秒' },
    { n: '爬楼梯', s: 1, r: '20 分钟', d: '注意保护膝盖，缓慢上楼' }
  ];
  const MEALS = {
    breakfast: '全麦面包 2 片 + 水煮蛋 2 个 + 无糖豆浆/脱脂牛奶 1 杯',
    lunch: '杂粮饭 1 拳 + 鸡胸肉/瘦牛肉 150g + 清炒时蔬 1 大份',
    dinner: '紫薯/玉米 1 个 + 清蒸鱼/虾仁 150g + 凉拌蔬菜',
    snack: '苹果/黄瓜/圣女果，或原味坚果一小把（约 15g）',
    rule: '少油少糖，戒含糖饮料；每天饮水 1.5-2L；晚餐 19:00 前吃完'
  };
  function partLabel(id) { const p = PLAN_PARTS.find((x) => x.id === id); return p ? p.label : '全身'; }
  function goalLabel(id) { const g = PLAN_GOALS.find((x) => x.id === id); return g ? g.label : '增肌'; }
  function exRow(ex) {
    return '<div class="plan-ex"><b>' + XU.esc(ex.n) + '</b><span>' + ex.s + ' 组 × ' + ex.r + '</span><i>' + XU.esc(ex.d) + '</i></div>';
  }
  function pickEx(partId, n, offset) {
    const list = EX[partId] || EX.full;
    const out = [];
    for (let i = 0; i < n; i++) out.push(list[(i + (offset || 0)) % list.length]);
    return out;
  }
  function dayBlock(day, title, rows, tip) {
    return '<div class="plan-day"><div class="pd-head"><b>' + day + '</b><span class="pd-tag">' + XU.esc(title) + '</span></div>' + rows + (tip ? '<div class="pd-tip">💡 ' + XU.esc(tip) + '</div>' : '') + '</div>';
  }
  function mealsHTML() {
    return '<div class="meal-grid">' +
      '<div class="meal-card"><b>🍳 早餐</b><p>' + MEALS.breakfast + '</p></div>' +
      '<div class="meal-card"><b>🍱 午餐</b><p>' + MEALS.lunch + '</p></div>' +
      '<div class="meal-card"><b>🥗 晚餐</b><p>' + MEALS.dinner + '</p></div>' +
      '<div class="meal-card"><b>🍎 加餐</b><p>' + MEALS.snack + '</p></div>' +
      '</div><div class="pd-tip">🥤 减脂原则：' + MEALS.rule + '</div>';
  }
  function weekPlanHTML(partId, goalId) {
    const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const SCHED = {
      muscle: [partId, 'core', partId, 'cardio', partId, 'full', 'rest'],
      shape: [partId, 'cardio', 'core', partId, 'cardio', 'full', 'rest'],
      fatburn: ['cardio', 'full', partId, 'cardio', 'full', 'core', 'rest'],
      stamina: [partId, 'full', 'cardio', 'core', partId, 'cardio', 'rest']
    };
    const sched = SCHED[goalId] || SCHED.muscle;
    return sched.map((t, i) => {
      const day = DAYS[i];
      if (t === 'rest') {
        return dayBlock(day, '休息日 · 主动恢复', exRow({ n: '全身拉伸', s: 1, r: '10-15 分钟', d: '肩颈、腰背、腿后侧各拉伸 30 秒' }) + exRow({ n: '散步/快走', s: 1, r: '20-30 分钟', d: '放松身心，促进恢复' }), '睡够 7-8 小时，多喝水');
      }
      if (t === 'cardio') {
        return dayBlock(day, '有氧日 · 燃脂', CARDIO.map(exRow).join(''), goalId === 'fatburn' ? '早晨空腹有氧前先喝杯温水' : '有氧后及时补充蛋白质');
      }
      if (t === 'core') return dayBlock(day, '核心训练', pickEx('core', 4, i).map(exRow).join(''), '平板支撑全程不塌腰，呼吸均匀');
      if (t === 'full') return dayBlock(day, '全身整合', pickEx('full', 5, i).map(exRow).join(''), '动作间休息 60-90 秒，量力而行');
      const tag = goalId === 'fatburn' ? '燃脂循环' : (goalId === 'muscle' ? '增肌主项' : (goalId === 'shape' ? '塑形主项' : '体能强化'));
      return dayBlock(day, partLabel(partId) + '训练 · ' + tag, pickEx(partId, 5, i * 2).map(exRow).join(''), goalId === 'fatburn' ? '组间休息 30-45 秒，保持心率' : '组间休息 60-90 秒，动作标准优先');
    }).join('');
  }
  function planCardHTML() {
    return '<div class="card">' +
      '<div style="display:flex;align-items:center;justify-content:space-between"><h2>📋 周计划生成</h2><span class="chip">输入部位 → 自动排周</span></div>' +
      '<p class="sub">选择目标部位与训练目标，一键生成一周训练安排（减脂模式附减脂餐）</p>' +
      '<label class="lbl">目标部位</label>' +
      '<div class="sym-chips" id="planPart">' + PLAN_PARTS.map((p) => '<button data-v="' + p.id + '">' + p.label + '</button>').join('') + '</div>' +
      '<label class="lbl" style="margin-top:10px">训练目标</label>' +
      '<div class="sym-chips" id="planGoal">' + PLAN_GOALS.map((g) => '<button data-v="' + g.id + '">' + g.label + '</button>').join('') + '</div>' +
      '<button class="btn" id="planGo" style="width:100%;margin-top:12px">✨ 生成我的周计划</button>' +
      '<div id="planOut" style="margin-top:12px"></div>' +
    '</div>';
  }
  XU.regPanel('fitness', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);
    const recs = await records();
    el.innerHTML = '<div id="fitnessBody"></div>' + '<div id="planBox"></div>' +
      '<div class="card"><h2>🎯 训练视频推荐</h2><p class="sub">按功能分类：燃脂 / 增肌 / 塑形 / 体能 / 柔韧 / 有氧 · 每日抖音更新</p>' +
      '<div class="tabs" id="partTabs">' + PARTS.map((p) => '<button class="tab" data-part="' + p.id + '">' + p.label + '</button>').join('') + '</div>' +
      '<div id="partVideos"><div class="empty">加载中…</div></div></div>';

    const body = XU.$('#fitnessBody', el);
    function renderAll() {
      body.innerHTML = bodyRecordCard(recs, renderAll) + '';
      body.appendChild(timerCard());
    }
    renderAll();
    /* 周计划生成：默认胸部/增肌，自动生成，可随时切换 */
    const planBox = XU.$('#planBox', el);
    if (planBox) {
      planBox.innerHTML = planCardHTML();
      let pPart = 'chest', pGoal = 'muscle';
      function renderPlanNow() {
        XU.$$('#planPart button', planBox).forEach((b) => b.classList.toggle('on', b.getAttribute('data-v') === pPart));
        XU.$$('#planGoal button', planBox).forEach((b) => b.classList.toggle('on', b.getAttribute('data-v') === pGoal));
        const out = XU.$('#planOut', planBox);
        out.innerHTML = (pGoal === 'fatburn' ? mealsHTML() : '') + '<div class="plan-wrap">' + weekPlanHTML(pPart, pGoal) + '</div>';
      }
      planBox.addEventListener('click', (e) => {
        const part = e.target.closest('#planPart button');
        if (part) { pPart = part.getAttribute('data-v'); renderPlanNow(); return; }
        const goal = e.target.closest('#planGoal button');
        if (goal) { pGoal = goal.getAttribute('data-v'); renderPlanNow(); return; }
        if (e.target.closest('#planGo')) { renderPlanNow(); XU.toast('周计划已生成 ✅'); }
      });
      renderPlanNow();
    }


    const tabs = XU.$('#partTabs', el);
    const videoBox = XU.$('#partVideos', el);
    let currentPart = PARTS[0].id;

    async function loadPart(partId) {
      currentPart = partId;
      XU.$$('.tab', tabs).forEach((t) => t.classList.toggle('active', t.getAttribute('data-part') === partId));
      videoBox.innerHTML = '<div class="empty">加载中…</div>';
      videoBox.innerHTML = await videoCard(partId);
    }
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (b) loadPart(b.getAttribute('data-part'));
    });
    loadPart(currentPart);
  });
})();
