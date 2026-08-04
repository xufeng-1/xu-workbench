/* panels/recipes.js —— 菜谱：每日川菜更新 */
(function () {
  const XU = window.XU;

  XU.regPanel('recipes', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await XU.feed('recipes').catch(() => ({}));
    const recipes = data.recipes || [];
    const updated = data.updated || XU.meta.updated || '';

    el.innerHTML =
      '<div class="card">' +
        '<h2>🌶️ 每日川菜</h2>' +
        '<p class="sub">每天更新几道新川菜 · 食材、做法、制作视频一应俱全</p>' +
        '<div class="updated">最近更新：' + updated + '</div>' +
        (recipes.length
          ? '<div class="list">' + recipes.map((r, i) =>
              '<div class="row-item" style="cursor:pointer" data-r="' + i + '">' +
                '<div style="width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#F3C1C1,#E8B04B);display:flex;align-items:center;justify-content:center;font-size:26px;flex:0 0 auto">🍲</div>' +
                '<div class="grow"><div class="title">' + XU.esc(r.title) + '</div>' +
                '<div class="desc">' + XU.esc(r.time || '') + (r.difficulty ? ' · ' + XU.esc(r.difficulty) : '') + (r.tags && r.tags.length ? ' · ' + r.tags.map((t) => '#' + XU.esc(t)).join(' ') : '') + '</div></div>' +
                '<span class="chip">做法</span>' +
              '</div>'
            ).join('') + '</div>'
          : '<div class="empty">今日菜谱更新中…</div>') +
      '</div>';

    el.addEventListener('click', (e) => {
      const item = e.target.closest('[data-r]');
      if (!item) return;
      const r = recipes[parseInt(item.getAttribute('data-r'), 10)];
      if (!r) return;
      let html = '<h3>🍲 ' + XU.esc(r.title) + '</h3>' +
        '<p class="sub">' + XU.esc(r.time || '') + (r.difficulty ? ' · ' + XU.esc(r.difficulty) : '') + (r.tags && r.tags.length ? ' · ' + r.tags.map((t) => '#' + XU.esc(t)).join(' ') : '') + '</p>';
      if (r.ingredients && r.ingredients.length) {
        html += '<p class="sub"><b>食材</b></p><div class="recipe-ing">' + r.ingredients.map((i) => '<span>' + XU.esc(i) + '</span>').join('') + '</div>';
      }
      if (r.steps && r.steps.length) {
        html += '<p class="sub" style="margin-top:12px"><b>制作方法</b></p><div class="steps">' +
          r.steps.map((s) => '<div class="step"><div>' + XU.esc(s) + '</div></div>').join('') + '</div>';
      }
      if (r.tips) html += '<p style="background:var(--card-tint);border-radius:12px;padding:10px;margin-top:10px">💡 <b>小贴士</b>：' + XU.esc(r.tips) + '</p>';
      if (r.video) {
        html += '<p class="sub" style="margin-top:12px"><b>制作视频</b></p><a class="video-card" href="' + XU.esc(r.video.url || '') + '" target="_blank" rel="noopener noreferrer" data-url="' + XU.esc(r.video.url || '') + '">' +
          (r.video.cover ? '<img src="' + XU.esc(r.video.cover) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '<div style="width:86px;height:58px;border-radius:10px;flex:0 0 auto;background:var(--primary-soft);display:flex;align-items:center;justify-content:center;color:var(--primary)">' + XU.icon('play') + '</div>') +
          '<div class="grow"><div class="vt">' + XU.esc(r.video.title || '做法视频') + '</div><div class="vd">点击跳转抖音观看</div></div>' +
          '<span class="play-badge">' + XU.icon('play') + '</span></a>';
      }
      XU.modal(html);
    });
  });
})();
