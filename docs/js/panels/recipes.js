/* panels/recipes.js —— 菜谱：每日多菜系更新（川菜/粤菜/湘菜/东北菜/江浙菜…） */
(function () {
  const XU = window.XU;

  const CUISINE_ORDER = ['川菜', '粤菜', '湘菜', '东北菜', '江浙菜', '闽菜', '鲁菜', '新疆菜', '台湾菜', '陕西菜'];

  XU.regPanel('recipes', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    const data = await XU.feed('recipes').catch(() => ({}));
    const recipes = (data.recipes || []).map((r) => {
      const c = r.cuisine || '川菜';
      return Object.assign({}, r, { cuisine: c });
    });
    const updated = data.updated || XU.meta.updated || '';

    const cuisines = ['全部'].concat(CUISINE_ORDER.filter((c) => recipes.some((r) => r.cuisine === c)));
    let cur = '全部';

    function cuisineColor(c) {
      const map = { '川菜': '#E2574C', '粤菜': '#2E9E6B', '湘菜': '#D9534F', '东北菜': '#C96A1F', '江浙菜': '#4C7BB8', '闽菜': '#7A5BB0', '鲁菜': '#B8853A', '新疆菜': '#C2543E', '台湾菜': '#B04E86', '陕西菜': '#A26A28' };
      return map[c] || 'var(--primary)';
    }

    el.innerHTML =
      '<div class="card">' +
        '<h2>🍳 每日菜谱</h2>' +
        '<p class="sub">每天更新几道新菜 · 川菜、粤菜、湘菜、东北菜、江浙菜…按菜系挑着做</p>' +
        '<div class="updated">最近更新：' + updated + '</div>' +
        '<div class="tabs" id="cuisineTabs" style="margin-top:10px">' +
          cuisines.map((c) => '<button class="tab' + (c === cur ? ' active' : '') + '" data-c="' + c + '">' + c + '</button>').join('') +
        '</div>' +
        '<div class="list" id="recipeList"></div>' +
      '</div>';

    const listEl = XU.$('#recipeList', el);

    function renderList() {
      const list = cur === '全部' ? recipes : recipes.filter((r) => r.cuisine === cur);
      listEl.innerHTML = list.length
        ? list.map((r, i) =>
            '<div class="row-item" style="cursor:pointer" data-r="' + i + '">' +
              '<div style="width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#F3C1C1,#E8B04B);display:flex;align-items:center;justify-content:center;font-size:26px;flex:0 0 auto">🍲</div>' +
              '<div class="grow"><div class="title">' + XU.esc(r.title) + '</div>' +
              '<div class="desc"><span class="cuisine-chip" style="background:' + cuisineColor(r.cuisine) + '22;color:' + cuisineColor(r.cuisine) + '">' + XU.esc(r.cuisine) + '</span>' +
                (r.time ? ' · ' + XU.esc(r.time) : '') + (r.difficulty ? ' · ' + XU.esc(r.difficulty) : '') +
                (r.tags && r.tags.length ? ' · ' + r.tags.map((t) => '#' + XU.esc(t)).join(' ') : '') + '</div></div>' +
              '<span class="chip">做法</span>' +
            '</div>'
          ).join('')
        : '<div class="empty">该菜系暂时没有菜谱，换个菜系看看吧</div>';
    }
    renderList();

    XU.$('#cuisineTabs', el).addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      cur = btn.getAttribute('data-c');
      XU.$$('.tab', el).forEach((b) => b.classList.toggle('active', b.getAttribute('data-c') === cur));
      renderList();
    });

    el.addEventListener('click', (e) => {
      const item = e.target.closest('[data-r]');
      if (!item) return;
      const r = recipes[parseInt(item.getAttribute('data-r'), 10)];
      if (!r) return;
      let html = '<h3>🍲 ' + XU.esc(r.title) + '</h3>' +
        '<p class="sub"><span class="cuisine-chip" style="background:' + cuisineColor(r.cuisine) + '22;color:' + cuisineColor(r.cuisine) + '">' + XU.esc(r.cuisine) + '</span>' +
        (r.time ? ' · ' + XU.esc(r.time) : '') + (r.difficulty ? ' · ' + XU.esc(r.difficulty) : '') +
        (r.tags && r.tags.length ? ' · ' + r.tags.map((t) => '#' + XU.esc(t)).join(' ') : '') + '</p>';
      if (r.ingredients && r.ingredients.length) {
        html += '<p class="sub"><b>食材</b></p><div class="recipe-ing">' + r.ingredients.map((i) => '<span>' + XU.esc(i) + '</span>').join('') + '</div>';
      }
      if (r.steps && r.steps.length) {
        html += '<p class="sub" style="margin-top:12px"><b>制作方法</b></p><div class="steps">' +
          r.steps.map((s) => '<div class="step"><div>' + XU.esc(s) + '</div></div>').join('') + '</div>';
      }
      if (r.tips) html += '<p style="background:var(--card-tint);border-radius:12px;padding:10px;margin-top:10px">💡 <b>小贴士</b>：' + XU.esc(r.tips) + '</p>';
      if (r.video) {
        const vp = r.video.play || '';
        html += '<p class="sub" style="margin-top:12px"><b>制作视频</b></p><a class="video-card" href="' + XU.esc(r.video.url || '') + '" target="' + XU.videoTarget + '" rel="noopener noreferrer" data-url="' + XU.esc(r.video.url || '') + '"' + (vp ? ' data-play="' + XU.esc(vp) + '"' : '') + '>' +
          (r.video.cover ? '<img src="' + XU.esc(r.video.cover) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '<div style="width:86px;height:58px;border-radius:10px;flex:0 0 auto;background:var(--primary-soft);display:flex;align-items:center;justify-content:center;color:var(--primary)">' + XU.icon('play') + '</div>') +
          '<div class="grow"><div class="vt">' + XU.esc(r.video.title || '做法视频') + '</div><div class="vd">点击跳转抖音观看</div></div>' +
          '<span class="play-badge">' + XU.icon('play') + '</span></a>';
      }
      XU.modal(html);
    });
  });
})();
