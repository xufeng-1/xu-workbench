/* panels/recipes.js —— 菜谱：每日多菜系更新（川菜/粤菜/湘菜/东北菜/江浙菜…） */
(function () {
  const XU = window.XU;

  const CUISINE_ORDER = ['川菜', '粤菜', '湘菜', '东北菜', '江浙菜', '鲁菜', '闽菜', '徽菜', '云南菜', '贵州菜', '湖北菜', '河南菜', '北京菜', '广西菜', '海南菜', '天津菜', '新疆菜', '台湾菜', '陕西菜'];

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

    const cuisines = ['全部'].concat(CUISINE_ORDER);
    let cur = '全部';

    function cuisineColor(c) {
      const map = { '川菜': '#E2574C', '粤菜': '#2E9E6B', '湘菜': '#D9534F', '东北菜': '#C96A1F', '江浙菜': '#4C7BB8', '鲁菜': '#B8853A', '闽菜': '#7A5BB0', '徽菜': '#8A6D3B', '云南菜': '#B05C2E', '贵州菜': '#C0392B', '湖北菜': '#3E8E7E', '河南菜': '#A67B2D', '北京菜': '#B23A48', '广西菜': '#2F9E63', '海南菜': '#2E9B8F', '天津菜': '#5E7CC2', '新疆菜': '#C2543E', '台湾菜': '#B04E86', '陕西菜': '#A26A28' };
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

    function starBtn(saved) {
      return '<button class="save-star' + (saved ? ' on' : '') + '" data-save="1" title="' + (saved ? '取消收藏' : '收藏这道菜') + '">' + (saved ? '★' : '☆') + '</button>';
    }
    async function renderList() {
      const list = cur === '全部' ? recipes : recipes.filter((r) => r.cuisine === cur);
      const savedSet = new Set((await XU.saveGet()).filter((it) => it.type === 'recipe').map((it) => it.title));
      listEl.innerHTML = list.length
        ? list.map((r, i) =>
            '<div class="row-item" style="cursor:pointer" data-r="' + i + '">' +
              '<div style="width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#F3C1C1,#E8B04B);display:flex;align-items:center;justify-content:center;font-size:26px;flex:0 0 auto">🍲</div>' +
              '<div class="grow"><div class="title">' + XU.esc(r.title) + '</div>' +
              '<div class="desc"><span class="cuisine-chip" style="background:' + cuisineColor(r.cuisine) + '22;color:' + cuisineColor(r.cuisine) + '">' + XU.esc(r.cuisine) + '</span>' +
                (r.time ? ' · ' + XU.esc(r.time) : '') + (r.difficulty ? ' · ' + XU.esc(r.difficulty) : '') +
                (r.tags && r.tags.length ? ' · ' + r.tags.map((t) => '#' + XU.esc(t)).join(' ') : '') + '</div></div>' +
              starBtn(savedSet.has(r.title)) +
              '<span class="chip">做法</span>' +
            '</div>'
          ).join('')
        : '<div class="empty">今天还没有这个菜系的菜，每天自动轮换，明天可能就有啦</div>';
    }
    renderList();

    XU.$('#cuisineTabs', el).addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      cur = btn.getAttribute('data-c');
      XU.$$('.tab', el).forEach((b) => b.classList.toggle('active', b.getAttribute('data-c') === cur));
      renderList();
    });

    el.addEventListener('click', async (e) => {
      const star = e.target.closest('[data-save]');
      if (star) {
        const row = star.closest('[data-r]');
        const r = row ? recipes[parseInt(row.getAttribute('data-r'), 10)] : null;
        if (!r) return;
        const saved = await XU.saveToggle({ type: 'recipe', title: r.title, url: (r.video && r.video.url) || '', note: r.cuisine + ' · ' + (r.time || '') + (r.difficulty ? ' · ' + r.difficulty : ''), tags: (r.tags || []).join(' ') });
        star.classList.toggle('on', saved);
        star.textContent = saved ? '★' : '☆';
        star.title = saved ? '取消收藏' : '收藏这道菜';
        XU.toast(saved ? '已收藏到「收藏」⭐' : '已取消收藏');
        return;
      }
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
