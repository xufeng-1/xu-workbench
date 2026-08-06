/* panels/friends.js —— 好友：名片/邀请码 + 好友列表 + 仿微信聊天 + 全功能排行榜 */
(function () {
  const XU = window.XU;
  const KEY = 'friends';
  const AVATARS = ['🐻', '🐱', '🐶', '🦊', '🐯', '🦁', '🐼', '🐸', '🦄', '🐙', '🐳', '🦉'];
  const RANK_ITEMS = [
    { id: 'fit', emoji: '💪', label: '健身运动', unit: '分钟', fmt: (v) => v + ' 分钟' },
    { id: 'nosmoke', emoji: '🚭', label: '无烟连续', unit: '天', fmt: (v) => v + ' 天' },
    { id: 'fish', emoji: '🎣', label: '钓鱼鱼获', unit: 'kg', fmt: (v) => v.toFixed(1) + ' kg' },
    { id: 'fishT', emoji: '🐟', label: '出钓次数', unit: '次', fmt: (v) => v + ' 次' },
    { id: 'goals', emoji: '🎯', label: '目标完成', unit: '%', fmt: (v) => v + '%' },
    { id: 'words', emoji: '📖', label: '单词已学', unit: '个', fmt: (v) => v + ' 个' },
    { id: 'diary', emoji: '📔', label: '日记篇数', unit: '篇', fmt: (v) => v + ' 篇' },
    { id: 'period', emoji: '🩸', label: '经期打卡', unit: '天', fmt: (v) => v + ' 天' }
  ];

  async function getData() {
    const rec = await XU.Store.kvGet(KEY);
    if (rec && rec.list) return rec;
    return { me: { nick: '我', avatar: '🐻', code: genCode() }, list: [], convs: {} };
  }
  async function saveData(d) { await XU.Store.kvSet(KEY, d); }

  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return 'XU-' + s;
  }
  function esc(s) { return XU.esc(s); }
  function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function uid() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function shortTime(t) {
    const d = new Date(t.replace(' ', 'T'));
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return t.slice(11, 16);
    return t.slice(5, 10);
  }
  function rangeStart(range) {
    const now = new Date();
    if (range === 'today') return XU.today();
    if (range === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay() + 1); // 周一
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    if (range === 'month') return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    return '';
  }
  function inRange(d, start) { return !start || (d || '') >= start; }

  /* 聚合我自己的排行数据（读取各面板本地记录） */
  async function myStats(range) {
    const start = rangeStart(range);
    const st = { fit: 0, nosmoke: null, fish: 0, fishT: 0, fishFee: 0, goals: 0, gDone: 0, gTotal: 0, words: 0, diary: 0, period: 0 };

    try {
      const wks = await XU.Store.all('workouts') || [];
      wks.forEach((w) => { if (w && inRange(w.id, start)) st.fit += num(w.minutes); });
    } catch (e) {}
    try {
      const smoke = (await XU.Store.kvGet('smoke')) || {};
      const days = Object.keys(smoke.days || {});
      let cigs = 0;
      days.forEach((d) => { if (inRange(d, start)) cigs += (smoke.days[d] || []).length; });
      st.cigs = cigs;
      if (range === 'today') {
        const last = days.length ? days.slice().sort().pop() : null;
        st.nosmoke = last ? XU.daysAgo(last) : 0;
      } else {
        st.nosmoke = cigs;
      }
    } catch (e) {}
    try {
      const fishing = (await XU.Store.kvGet('fishing')) || { trips: [] };
      (fishing.trips || []).forEach((t) => {
        if (!inRange(t.date, start)) return;
        st.fishT++;
        let w = 0;
        (t.fish || []).forEach((f) => { w += num(f.weight); });
        st.fish += w;
        st.fishFee += num(t.fee) + num(t.backWeight) * num(t.backPrice);
      });
    } catch (e) {}
    try {
      const goals = (await XU.Store.kvGet('goals')) || { goals: [] };
      st.gTotal = (goals.goals || []).length;
      st.gDone = (goals.goals || []).filter((g) => g && g.done).length;
      st.goals = st.gTotal ? Math.round((st.gDone / st.gTotal) * 100) : 0;
    } catch (e) {}
    try {
      const words = (await XU.Store.kvGet('wordLearned')) || {};
      st.words = Object.keys(words).length;
    } catch (e) {}
    try {
      const diary = (await XU.Store.kvGet('diary')) || { entries: {} };
      st.diary = Object.values(diary.entries || {}).filter((e) => e && (e.win || e.grat || e.plan || e.note)).length;
    } catch (e) {}
    try {
      const period = (await XU.Store.kvGet('period')) || { logs: {} };
      st.period = Object.keys(period.logs || {}).filter((d) => inRange(d, start)).length;
    } catch (e) {}
    return st;
  }

  /* 云端接口占位：接入 friend-backend.js 后自动启用（本地模式仅存本机） */
  XU.Friends = XU.Friends || { mode: 'local', ready: false };  XU.regPanel('friends', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await getData();
    let tab = 'friends';      // friends | chats | rank
    let activeFid = null;
    let range = 'today';

    /* ---------- 我的名片 ---------- */
    function renderMine() {
      const box = XU.$('#meCard', el);
      const link = 'https://xufeng-1.github.io/xu-workbench/?invite=' + encodeURIComponent(data.me.code);
      box.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<button class="friend-ava" id="meAva" title="换头像">' + esc(data.me.avatar) + '</button>' +
          '<div style="flex:1;min-width:0">' +
            '<input type="text" id="meNick" maxlength="12" value="' + esc(data.me.nick) + '" style="font-size:16px;font-weight:800;border:none;background:transparent;padding:0;width:100%">' +
            '<div class="vd">邀请码 <b style="color:var(--primary)">' + esc(data.me.code) + '</b> · ' + (XU.Friends.ready ? '云端已连接' : '本地模式') + '</div>' +
          '</div>' +
          '<button class="btn mini ghost" id="meInvite">' + XU.icon('copy') + ' 邀请</button>' +
        '</div>' +
        '<div class="seg" id="meAvaPick" style="display:none;margin-top:10px">' +
          AVATARS.map((a) => '<button data-a="' + a + '">' + a + '</button>').join('') +
        '</div>';
      XU.$('#meInvite', box).onclick = () => {
        const text = '我在用「xu的工作台」，加我好友一起比拼打卡吧！\n打开链接并输入我的邀请码：\n' + data.me.code + '\n' + link;
        XU.copyText ? XU.copyText(text) : navigator.clipboard && navigator.clipboard.writeText(text);
        XU.toast('邀请信息已复制，去微信粘贴发送 ✅');
      };
      XU.$('#meAva', box).onclick = () => { const p = XU.$('#meAvaPick', box); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; };
      XU.$('#meAvaPick', box).addEventListener('click', async (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        data.me.avatar = b.getAttribute('data-a');
        await saveData(data);
        XU.$('#meAvaPick', box).style.display = 'none';
        renderMine();
      });
      XU.$('#meNick', box).addEventListener('change', async (e) => {
        const v = e.target.value.trim();
        if (v) { data.me.nick = v; await saveData(data); XU.toast('昵称已保存 ✅'); }
      });
    }

    /* ---------- 好友列表 ---------- */
    function renderFriends() {
      const box = XU.$('#friendList', el);
      box.innerHTML = data.list.length
        ? data.list.map((f) =>
            '<div class="row-item">' +
              '<div class="friend-ava" style="width:42px;height:42px;font-size:21px">' + esc(f.avatar || '🙂') + '</div>' +
              '<div class="grow"><div class="title" style="font-weight:800">' + esc(f.nick) + (f.note ? ' <span style="color:var(--muted);font-weight:500;font-size:12px">' + esc(f.note) + '</span>' : '') + '</div>' +
              '<div class="vd">' + esc(f.code || '') + ' · 添加于 ' + esc(f.addedAt || '') + '</div></div>' +
              '<button class="btn mini" data-chat="' + esc(f.id) + '">聊天</button>' +
              '<button class="btn mini danger" data-delf="' + esc(f.id) + '">' + XU.icon('trash') + '</button>' +
            '</div>').join('')
        : '<div class="empty">还没有好友～点下方「添加好友」，或把邀请码发给朋友</div>';
    }

    function addFriendModal() {
      XU.modal(
        '<h3>👥 添加好友</h3>' +
        '<label class="lbl">好友邀请码（选填，来自对方分享的链接）</label>' +
        '<input type="text" id="fCode" maxlength="16" placeholder="例如 XU-3F8K2P">' +
        '<label class="lbl">昵称</label><input type="text" id="fNick" maxlength="12" placeholder="例如 小明">' +
        '<label class="lbl">备注（选填）</label><input type="text" id="fNote" maxlength="12" placeholder="例如 大学同学">' +
        '<p class="sub">云端连接后可自动识别邀请码；当前本地模式先手动添加</p>' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">添加</button></div>',
        { onMount: (mask, close) => {
          XU.$('[data-x=no]', mask).onclick = close;
          XU.$('[data-x=yes]', mask).onclick = async () => {
            const code = XU.$('#fCode', mask).value.trim();
            const nick = XU.$('#fNick', mask).value.trim();
            if (!nick) { XU.toast('请填写好友昵称'); return; }
            if (data.list.some((x) => x.nick === nick)) { XU.toast('该好友已存在'); return; }
            data.list.push({ id: uid(), nick: nick, note: XU.$('#fNote', mask).value.trim(), code: code, avatar: AVATARS[data.list.length % AVATARS.length], addedAt: XU.today() });
            data.convs[data.list[data.list.length - 1].id] = data.convs[data.list[data.list.length - 1].id] || [];
            await saveData(data);
            close(); renderFriends(); renderChats();
            XU.toast('已添加好友 ✅');
          };
        } }
      );
    }    /* ---------- 聊天 ---------- */
    function friendOf(id) { return data.list.find((f) => f.id === id) || null; }

    function msgBubble(m, f) {
      const mine = m.from === 'me';
      let body = '<div class="chat-bubble ' + (mine ? 'me' : 'them') + '">';
      if (m.kind === 'text') {
        body += esc(m.text || '');
      } else {
        const meta = { video: '🎬 视频', quote: '💬 金句', recipe: '🍲 菜谱', book: '📚 书籍', link: '🔗 链接' };
        body += '<b>' + (meta[m.kind] || '分享') + ' · ' + esc(m.title || '') + '</b>';
        if (m.text) body += '<div style="margin-top:4px;opacity:.85;font-size:13px">' + esc(m.text) + '</div>';
        if (m.url) body += '<div class="chat-share">' + esc(m.url) + '</div>';
      }
      body += '</div>';
      return '<div class="chat-row">' + (mine ? '' : '<div class="friend-ava" style="width:32px;height:32px;font-size:16px">' + esc(f.avatar || '🙂') + '</div>') + body + '</div>';
    }

    function renderChats() {
      const box = XU.$('#chatList', el);
      box.innerHTML = data.list.length
        ? data.list.map((f) => {
            const msgs = data.convs[f.id] || [];
            const last = msgs.length ? msgs[msgs.length - 1] : null;
            const preview = last ? (last.kind === 'text' ? last.text : (last.title || '分享了一条消息')) : '还没有聊天记录';
            const t = last ? shortTime(last.time) : '';
            return '<div class="row-item" data-chat="' + esc(f.id) + '" style="cursor:pointer">' +
              '<div class="friend-ava" style="width:44px;height:44px;font-size:22px">' + esc(f.avatar || '🙂') + '</div>' +
              '<div class="grow"><div class="title" style="font-weight:800">' + esc(f.nick) + '</div>' +
              '<div class="vd" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(preview) + '</div></div>' +
              (t ? '<div class="vd" style="flex:0 0 auto">' + esc(t) + '</div>' : '') +
            '</div>';
          }).join('')
        : '<div class="empty">先添加好友，再开始聊天～</div>';
    }

    function openChat(fid) {
      activeFid = fid;
      const f = friendOf(fid);
      if (!f) return;
      const box = XU.$('#chatView', el);
      box.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
          '<button class="btn mini ghost" id="chatBack">' + XU.icon('back') + ' 返回</button>' +
          '<div class="friend-ava" style="width:34px;height:34px;font-size:17px">' + esc(f.avatar || '🙂') + '</div>' +
          '<b>' + esc(f.nick) + '</b>' +
          '<span class="chip" style="margin-left:auto">' + (XU.Friends.ready ? '在线' : '本地') + '</span>' +
        '</div>' +
        '<div id="chatMsgs" style="min-height:180px"></div>' +
        '<div class="chat-input">' +
          '<button class="btn mini ghost" id="chatShare" title="分享视频/文章/金句/菜谱">' + XU.icon('plus') + '</button>' +
          '<input type="text" id="chatText" placeholder="发消息…" style="flex:1">' +
          '<button class="btn" id="chatSend">发送</button>' +
        '</div>';
      XU.$('#chatBack', box).onclick = () => { activeFid = null; renderAll(); };
      XU.$('#chatSend', box).onclick = () => sendMsg();
      XU.$('#chatText', box).addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });
      XU.$('#chatShare', box).onclick = () => shareModal(fid);
      renderMsgs(fid);
    }

    function renderMsgs(fid) {
      const box = XU.$('#chatMsgs', el);
      if (!box) return;
      const f = friendOf(fid);
      const msgs = data.convs[fid] || [];
      box.innerHTML = msgs.length
        ? msgs.map((m) => '<div class="chat-time">' + esc(m.time) + '</div>' + msgBubble(m, f)).join('')
        : '<div class="empty">和 ' + esc(f.nick) + ' 打个招呼吧～（云端连接后消息实时互达）</div>';
      box.scrollTop = box.scrollHeight;
    }

    async function pushMsg(fid, msg) {
      data.convs[fid] = data.convs[fid] || [];
      data.convs[fid].push(msg);
      data.convs[fid] = data.convs[fid].slice(-200);
      await saveData(data);
      if (XU.Friends.ready && XU.Friends.send) {
        try { await XU.Friends.send(fid, msg); } catch (e) {}
      }
    }

    function sendMsg() {
      const input = XU.$('#chatText', el);
      const text = (input ? input.value : '').trim();
      if (!text || !activeFid) return;
      pushMsg(activeFid, { from: 'me', kind: 'text', text: text, time: XU.now() });
      if (input) input.value = '';
      renderMsgs(activeFid);
      renderChats();
    }

    /* 分享选择器：从收藏库里选视频/金句/菜谱/书籍/链接发送给好友 */
    async function shareModal(fid) {
      let items = [];
      try { items = await XU.saveGet() || []; } catch (e) {}
      items = items.slice().reverse().slice(0, 40);
      const opts = {
        title: '分享给 ' + (friendOf(fid) || {}).nick,
        onMount: (mask, close) => {
          const list = XU.$('#shareList', mask);
          const render = (arr) => {
            list.innerHTML = arr.length
              ? arr.map((it, i) =>
                  '<button class="row-item" style="width:100%;text-align:left;border:none;background:transparent;padding:8px 0;cursor:pointer" data-s="' + i + '">' +
                    '<div class="friend-ava" style="width:36px;height:36px;font-size:17px">' + ({ video: '🎬', quote: '💬', recipe: '🍲', book: '📚', link: '🔗' }[it.type] || '📎') + '</div>' +
                    '<div class="grow"><div class="title" style="font-weight:700">' + esc(it.title) + '</div>' +
                    '<div class="vd">' + esc(it.note || it.tags || '') + '</div></div>' +
                  '</button>').join('')
              : '<div class="empty">收藏库是空的，先去其他面板收藏内容吧</div>';
          };
          render(items);
          XU.$('#shareKw', mask).addEventListener('input', (e) => {
            const q = e.target.value.trim();
            render(q ? items.filter((it) => (it.title + it.note + it.tags).indexOf(q) >= 0) : items);
          });
          list.addEventListener('click', async (e) => {
            const b = e.target.closest('[data-s]');
            if (!b) return;
            const it = items[parseInt(b.getAttribute('data-s'), 10)];
            await pushMsg(fid, { from: 'me', kind: it.type || 'link', title: it.title, url: it.url, text: (it.note || '').slice(0, 60), time: XU.now() });
            close(); renderMsgs(fid); renderChats();
            XU.toast('已发送分享 ✅');
          });
          XU.$('[data-x=no]', mask).onclick = close;
        }
      };
      XU.modal(
        '<h3>📤 分享内容</h3>' +
        '<input type="search" id="shareKw" placeholder="🔍 搜索收藏…" style="margin-bottom:6px">' +
        '<div class="list" id="shareList" style="max-height:60vh;overflow:auto"></div>' +
        '<div class="actions"><button class="btn ghost" data-x="no">取消</button></div>',
        opts
      );
    }    /* ---------- 排行榜 ---------- */
    async function renderRank() {
      const box = XU.$('#rankBody', el);
      const st = await myStats(range);
      const rows = RANK_ITEMS.map((it) => {
        let v = st[it.id], sub = it.unit;
        if (it.id === 'fit') v = st.fit;
        if (it.id === 'nosmoke') {
          if (range === 'today') { v = st.nosmoke; sub = '距上次抽烟的天数'; }
          else { v = st.cigs; sub = '本周期抽烟根数'; }
        }
        const val = (v == null || v === '—') ? '—' : (it.id === 'nosmoke' && range !== 'today' ? v + ' 根' : it.fmt(v));
        return '<div class="row-item">' +
          '<div class="friend-ava" style="width:38px;height:38px;font-size:18px">' + it.emoji + '</div>' +
          '<div class="grow"><div class="title" style="font-weight:800">' + it.label + '</div><div class="vd">' + sub + '</div></div>' +
          '<div style="text-align:right"><div style="font-weight:800;color:var(--primary);font-size:15px">' + esc(String(val)) + '</div>' +
          '<div class="vd">🥇 仅自己</div></div>' +
        '</div>';
      }).join('');
      const cloudNote = XU.Friends.ready
        ? '<div class="row-item"><div class="friend-ava" style="width:38px;height:38px;font-size:18px">☁️</div><div class="grow"><div class="title">云端排行已开启</div><div class="vd">好友数据自动同步</div></div></div>'
        : '<div class="row-item"><div class="friend-ava" style="width:38px;height:38px;font-size:18px">📡</div><div class="grow"><div class="title">好友排行待连接云端</div><div class="vd">配置免费云端后，好友之间的排名自动同步（见备忘录）</div></div></div>';
      box.innerHTML =
        '<div class="card">' + cloudNote + '</div>' +
        '<div class="card">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
            '<h2 style="margin:0">🏆 排行榜</h2>' +
            '<button class="btn mini ghost" id="rankRefresh">🔄 刷新</button>' +
          '</div>' +
          '<div class="seg" id="rankSeg" style="margin:10px 0">' +
            [['today', '今日'], ['week', '本周'], ['month', '本月'], ['all', '累计']].map((r) =>
              '<button data-r="' + r[0] + '"' + (range === r[0] ? ' class="on"' : '') + '>' + r[1] + '</button>').join('') +
          '</div>' +
          '<div class="list">' + rows + '</div>' +
        '</div>' +
        '<p class="sub" style="padding:0 4px">排行榜自动汇总你在健身/抽烟/钓鱼/目标/单词/日记/经期里的真实记录，无需手动填写</p>';
      XU.$('#rankSeg', box).addEventListener('click', async (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        range = b.getAttribute('data-r');
        XU.$$('#rankSeg button', box).forEach((x) => x.classList.toggle('on', x === b));
        await renderRank();
      });
      XU.$('#rankRefresh', box).onclick = () => renderRank();
    }

    function renderAll() {
      renderMine();
      renderFriends();
      renderChats();
      if (activeFid && friendOf(activeFid)) renderMsgs(activeFid);
    }

    /* ---------- 骨架 ---------- */
    el.innerHTML =
      '<div class="hero">' +
        '<h2 style="color:#fff;margin:0 0 4px">👥 好友</h2>' +
        '<p style="margin:0;font-size:12.5px;opacity:.92">好友聊天 · 分享内容 · 全功能打卡排行榜</p>' +
      '</div>' +
      '<div class="card" id="meCard"></div>' +
      '<div class="tabs" id="fTab">' +
        '<button class="tab active" data-t="friends">好友</button>' +
        '<button class="tab" data-t="chats">聊天</button>' +
        '<button class="tab" data-t="rank">排行榜</button>' +
      '</div>' +
      '<div id="fFriends">' +
        '<div class="card"><h2>我的好友</h2><div class="list" id="friendList"></div>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button class="btn" style="flex:1" id="fAdd">＋ 添加好友</button>' +
        '</div></div>' +
      '</div>' +
      '<div id="fChats" hidden>' +
        '<div class="card"><h2>💬 会话</h2><div class="list" id="chatList"></div></div>' +
        '<div id="chatView"></div>' +
      '</div>' +
      '<div id="fRank" hidden><div id="rankBody"></div></div>';

    renderMine(); renderFriends(); renderChats(); renderRank();

    XU.$('#fTab', el).addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      tab = b.getAttribute('data-t');
      XU.$$('#fTab .tab', el).forEach((x) => x.classList.toggle('active', x === b));
      XU.$('#fFriends', el).hidden = tab !== 'friends';
      XU.$('#fChats', el).hidden = tab !== 'chats';
      XU.$('#fRank', el).hidden = tab !== 'rank';
      if (tab === 'rank') renderRank();
    });

    XU.$('#fAdd', el).onclick = addFriendModal;

    el.addEventListener('click', async (e) => {
      const chat = e.target.closest('[data-chat]');
      if (chat) {
        const fid = chat.getAttribute('data-chat');
        if (tab === 'chats') { openChat(fid); return; }
        tab = 'chats';
        XU.$$('#fTab .tab', el).forEach((x) => x.classList.toggle('active', x.getAttribute('data-t') === 'chats'));
        XU.$('#fFriends', el).hidden = true;
        XU.$('#fChats', el).hidden = false;
        XU.$('#fRank', el).hidden = true;
        openChat(fid);
        return;
      }
      const delf = e.target.closest('[data-delf]');
      if (delf) {
        const fid = delf.getAttribute('data-delf');
        const f = friendOf(fid);
        XU.confirm('删除好友 ' + esc(f ? f.nick : fid) + '？（聊天记录也会删除）', async () => {
          data.list = data.list.filter((x) => x.id !== fid);
          delete data.convs[fid];
          await saveData(data);
          renderFriends(); renderChats();
        }, true);
      }
    });
  });
})();