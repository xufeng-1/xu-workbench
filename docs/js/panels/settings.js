/* panels/settings.js —— 设置：左侧导航项目增删、数据导出/清空、关于 */
(function () {
  const XU = window.XU;
  const DESCS = {
    home: '问候、统计卡、今日任务',
    fitness: '身高体重、计时器、训练视频',
    friends: '好友聊天、排行榜',
    creation: 'AI漫剧学习、爆款脚本',
    english: '单词打卡、场景口语、新概念',
    reading: '书籍、播客、金句',
    period: '经期记录、周期预测、营养补血',
    pomodoro: '25分钟专注计时',
    smoke: '抽烟间隔与统计',
    diary: '每日反思三问',
    fishing: '鱼获重量、钓费记录',
    travel: '全国目的地、行程生成',
    stock: '行情快照、基金估值',
    goals: '目标与里程碑',
    games: '摸鱼小游戏、无限冲关',
    money: '收支记账、分类占比',
    recipes: '多菜系菜谱',
    saves: '收藏的视频/菜谱/书籍'
  };
  const EMOJI = { home:'🏠', fitness:'🏋️', friends:'👥', creation:'🎬', english:'🇬🇧', reading:'📚', period:'🌸', pomodoro:'🍅', smoke:'🚬', diary:'📓', fishing:'🎣', travel:'🧳', stock:'📈', goals:'🎯', games:'🎮', money:'💰', recipes:'🍳', saves:'⭐', settings:'⚙️' };

  XU.regPanel('settings', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const hidden = XU.getHiddenPanels();
    const panels = XU.ALL_PANELS;

    function row(p) {
      const isHidden = hidden.indexOf(p.id) >= 0;
      return '<div class="row-item">' +
        '<div style="width:38px;height:38px;border-radius:12px;background:var(--card-tint);display:flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 auto">' + (EMOJI[p.id] || '•') + '</div>' +
        '<div class="grow"><div class="title">' + XU.esc(p.label) + '</div><div class="desc">' + (DESCS[p.id] || '') + '</div></div>' +
        (p.lock ? '<span class="chip">常驻</span>' : '<button class="toggle' + (isHidden ? '' : ' on') + '" data-tg="' + p.id + '" role="switch" aria-checked="' + (!isHidden) + '" aria-label="' + p.label + '"></button>') +
      '</div>';
    }

    el.innerHTML =
      '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">⚙️ 设置</h2><p style="margin:0;font-size:12.5px;opacity:.92">管理左侧导航 · 数据与隐私</p></div>' +
      '<div class="card">' +
        '<h2>🧭 左侧导航管理</h2>' +
        '<p class="sub">关掉用不到的项目，左侧导航会更精简；想用时随时打开。改动后自动刷新。</p>' +
        '<div class="list">' + panels.map(row).join('') + '</div>' +
        '<div class="actions" style="margin-top:12px">' +
          '<button class="btn" id="setAllOn" style="flex:1">全部显示</button>' +
          '<button class="btn ghost" id="setAllOff" style="flex:1">全部隐藏</button>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<h2>🗄️ 数据管理</h2>' +
        '<p class="sub">你的所有记录（任务、体重、记账、打卡、聊天等）只保存在手机本机，不上传任何服务器。</p>' +
        '<div class="actions">' +
          '<button class="btn ghost" id="btnExport" style="flex:1">📤 导出备份</button>' +
          '<button class="btn danger" id="btnClear" style="flex:1">🧹 清空数据</button>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<h2>ℹ️ 关于</h2>' +
        '<div class="list">' +
          '<div class="row-item"><div class="grow"><div class="title">版本</div><div class="desc">xu工作台 · 内容每日自动更新</div></div><span class="chip">v2.0</span></div>' +
          '<div class="row-item"><div class="grow"><div class="title">数据安全</div><div class="desc">数据存在浏览器本地（IndexedDB），卸载或清理缓存会丢失，建议定期导出备份</div></div></div>' +
          '<div class="row-item"><div class="grow"><div class="title">安装为 App</div><div class="desc">浏览器菜单 → 「添加到主屏幕」，即可像 App 一样全屏使用</div></div></div>' +
        '</div>' +
      '</div>';

    function applyHidden() {
      const cur = XU.getHiddenPanels();
      XU.$$('.toggle', el).forEach((t) => {
        const id = t.getAttribute('data-tg');
        t.classList.toggle('on', cur.indexOf(id) < 0);
        t.setAttribute('aria-checked', String(cur.indexOf(id) < 0));
      });
    }

    el.addEventListener('click', (e) => {
      const tg = e.target.closest('.toggle');
      if (tg) {
        const id = tg.getAttribute('data-tg');
        const nowVisible = tg.classList.contains('on');
        XU.setPanelHidden(id, nowVisible);
        XU.toast(nowVisible ? '已隐藏「' + id + '」，即将刷新' : '已显示「' + id + '」，即将刷新');
        setTimeout(() => location.reload(), 500);
        return;
      }
      if (e.target.id === 'setAllOn') {
        try { localStorage.removeItem('xu_panels_hidden'); } catch (err) {}
        XU.toast('已全部显示，即将刷新');
        setTimeout(() => location.reload(), 500);
        return;
      }
      if (e.target.id === 'setAllOff') {
        panels.forEach((p) => { if (!p.lock) XU.setPanelHidden(p.id, true); });
        XU.toast('已全部隐藏，即将刷新');
        setTimeout(() => location.reload(), 500);
        return;
      }
      if (e.target.id === 'btnExport') {
        (async () => {
          const out = {};
          const stores = ['kv', 'tasks', 'water', 'fitness', 'money', 'words', 'reading', 'workouts', 'custom'];
          for (let i = 0; i < stores.length; i++) {
            try { out[stores[i]] = await XU.Store.all(stores[i]); } catch (err) {}
          }
          out._exported = XU.now();
          const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'xu-workbench-backup-' + XU.today() + '.json';
          document.body.appendChild(a); a.click(); a.remove();
          XU.toast('已导出备份文件 ✅');
        })();
        return;
      }
      if (e.target.id === 'btnClear') {
        XU.confirm('将清空本机全部数据（任务/体重/记账/打卡/聊天等），且不可恢复。确定清空吗？', async () => {
          try { await XU.Store.clear(); } catch (err) {}
          try { localStorage.clear(); } catch (err) {}
          XU.toast('已清空，即将刷新');
          setTimeout(() => location.reload(), 600);
        }, true);
      }
    });
  });
})();