/* panels/creation.js —— 创作：AI漫剧学习 / 爆款脚本 */
(function () {
  const XU = window.XU;

  function scriptText(s) {
    const sc = s.script || {};
    let out = '【爆款脚本】' + s.title + '\n';
    out += '作者：' + (s.author || '') + '\n';
    out += '主题：' + (s.topic || '') + '\n\n';
    if (sc.concept) out += '■ 创意概念\n' + sc.concept + '\n\n';
    if (sc.roles && sc.roles.length) {
      out += '■ 角色设定\n';
      sc.roles.forEach((r) => { out += '· ' + r.name + '：' + r.desc + '\n'; });
      out += '\n';
    }
    if (sc.scenes && sc.scenes.length) {
      out += '■ 分镜脚本\n';
      sc.scenes.forEach((sn, i) => {
        out += '【场景' + (i + 1) + '】' + sn.setting + '\n';
        (sn.shots || []).forEach((sh, j) => {
          out += '  镜头' + (j + 1) + '｜' + sh.shot + '｜' + sh.camera + '\n';
          if (sh.subtitle) out += '    字幕：' + sh.subtitle + '\n';
          if (sh.music) out += '    音乐：' + sh.music + '\n';
        });
        out += '\n';
      });
    }
    if (sc.hook) out += '■ 结尾钩子\n' + sc.hook + '\n';
    return out;
  }

  function scriptDetail(s) {
    const sc = s.script || {};
    let html = '<h3>🎬 ' + XU.esc(s.title) + '</h3><p class="sub">' + XU.esc(s.author || '') + ' · 每日抖音爆款生成</p>';
    html += '<button class="btn" id="copyScript" style="width:100%;margin-bottom:12px">' + XU.icon('copy') + ' 一键复制整套脚本</button>';
    if (sc.concept) html += '<p style="background:var(--card-tint);border-radius:12px;padding:10px"><b>创意概念</b>：' + XU.esc(sc.concept) + '</p>';
    if (sc.roles && sc.roles.length) {
      html += '<p class="sub" style="margin-top:12px"><b>角色设定</b></p>';
      html += sc.roles.map((r) => '<div class="row-item" style="margin-bottom:6px"><span class="chip">' + XU.esc(r.name) + '</span><span class="grow" style="font-size:13px">' + XU.esc(r.desc) + '</span></div>').join('');
    }
    if (sc.scenes && sc.scenes.length) {
      html += '<p class="sub" style="margin-top:12px"><b>分镜脚本</b></p>';
      sc.scenes.forEach((sn, i) => {
        html += '<div class="card" style="background:var(--card-tint);box-shadow:none;padding:12px"><b>场景' + (i + 1) + '｜' + XU.esc(sn.setting) + '</b>';
        (sn.shots || []).forEach((sh, j) => {
          html += '<div style="margin-top:8px;font-size:13px">' +
            '<span class="chip">镜头' + (j + 1) + '</span> <span>' + XU.esc(sh.shot) + '</span> · <span style="color:var(--muted)">' + XU.esc(sh.camera) + '</span>' +
            (sh.subtitle ? '<div style="margin-top:3px;color:var(--text)">💬 字幕：' + XU.esc(sh.subtitle) + '</div>' : '') +
            (sh.music ? '<div style="color:var(--muted)">🎵 音乐：' + XU.esc(sh.music) + '</div>' : '') +
            '</div>';
        });
        html += '</div>';
      });
    }
    if (sc.hook) html += '<p style="margin-top:10px"><b>结尾钩子</b>：' + XU.esc(sc.hook) + '</p>';
    return html;
  }

  XU.regPanel('creation', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);
    const data = await XU.feed('creation').catch(() => ({}));
    const drama = (data.drama || []).filter((v) => v && v.title).slice(0, 6);
    const scripts = (data.scripts || []).filter((s) => s && s.title).slice(0, 10);

    el.innerHTML =
      '<div class="card">' +
        '<h2>🎭 AI 漫剧学习</h2><p class="sub">每日 6 条抖音热门漫剧 · 学习爆款节奏与叙事</p>' +
        (drama.length
          ? '<div class="list">' + drama.map((v) =>
              '<div class="row-item">' + XU.videoCard(v) + '</div>'
            ).join('') + '</div>'
          : '<div class="empty">今日漫剧视频更新中～</div>') +
      '</div>' +

      '<div class="card">' +
        '<h2>🔥 爆款脚本</h2><p class="sub">每日 10 条抖音热门爆款 · 自动生成完整分镜脚本（角色设定/场景/镜头/字幕/音乐）</p>' +
        (scripts.length
          ? '<div class="list">' + scripts.map((s, i) =>
              '<div class="row-item" style="cursor:pointer" data-script="' + i + '">' +
                '<div class="grow"><div class="title">' + (i + 1) + '. ' + XU.esc(s.title) + '</div>' +
                '<div class="desc">' + XU.esc(s.author || '') + (s.topic ? ' · ' + XU.esc(s.topic) : '') + '</div></div>' +
                '<span class="chip">看脚本</span>' +
              '</div>'
            ).join('') + '</div>'
          : '<div class="empty">今日脚本生成中～</div>') +
      '</div>';

    const card = XU.$('.panel', el);
    el.addEventListener('click', (e) => {
      const item = e.target.closest('[data-script]');
      if (!item) return;
      const s = scripts[parseInt(item.getAttribute('data-script'), 10)];
      if (!s) return;
      const close = XU.modal(scriptDetail(s), { onMount: (mask) => {
        const copy = XU.$('#copyScript', mask);
        if (copy) copy.onclick = () => XU.copy(scriptText(s), '脚本已复制，去创作吧 🎬');
      } });
    });
  });
})();
