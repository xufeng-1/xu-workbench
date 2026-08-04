/* panels/study.js —— 数据：数据分析知识章节 + 每日视频更新 */
(function () {
  const XU = window.XU;

  XU.regPanel('study', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    let openId = null;

    const [chapters, feed] = await Promise.all([
      XU.feed('study').catch(() => []),
      XU.feed('studyFeed').catch(() => ({}))
    ]);

    // 把每日追加的视频合并到对应章节（旧内容全部保留）
    const byChapter = {};
    (feed.updates || []).forEach((u) => {
      (u.videos || []).forEach((v) => {
        const cid = v.chapterId || v.chapter || '';
        if (!byChapter[cid]) byChapter[cid] = [];
        byChapter[cid].push(Object.assign({ date: u.date }, v));
      });
    });

    el.innerHTML =
      '<div class="card">' +
        '<h2>📊 数据分析学习</h2>' +
        '<p class="sub">章节制系统学习 · 每章配套每日更新的抖音视频 · 历史内容全部保留可复习</p>' +
        '<div class="updated">最近更新：' + (feed.date || XU.meta.updated || '—') + '</div>' +
        '<div class="list" id="chapterList"></div>' +
      '</div>';

    const list = XU.$('#chapterList', el);

    function renderChapters() {
      list.innerHTML = (chapters.length ? chapters : [{ id: 'coming', title: '课程筹备中', summary: '数据分析章节正在陆续上线，敬请期待。', points: [], videos: [] }])
        .map((c, ci) => {
          const daily = byChapter[c.id] || [];
          const open = openId === c.id;
          return '<div class="card" style="margin-bottom:10px;box-shadow:none;border:1.5px solid var(--line)">' +
            '<div style="display:flex;align-items:center;gap:8px;cursor:pointer" data-ch="' + ci + '">' +
              '<span style="color:var(--primary)">' + (open ? '▾' : '▸') + '</span>' +
              '<div class="grow"><div class="title">' + XU.esc(c.title) + '</div>' +
              '<div class="desc">' + XU.esc(c.summary || '') + '</div></div>' +
              (daily.length ? '<span class="badge">' + daily.length + ' 条视频</span>' : '') +
            '</div>' +
            (open ? renderChapterBody(c, daily) : '') +
          '</div>';
        }).join('');
    }

    function renderChapterBody(c, daily) {
      let html = '<div style="margin-top:12px">';
      if (c.points && c.points.length) {
        html += '<p class="sub"><b>核心知识点</b></p>';
        html += '<div class="list">' + c.points.map((p) =>
          '<div class="row-item" style="background:#fff"><div class="grow" style="font-size:13px">' + XU.esc(p) + '</div></div>'
        ).join('') + '</div>';
      }
      const allVideos = (c.videos || []).concat(daily);
      if (allVideos.length) {
        html += '<p class="sub" style="margin-top:12px"><b>配套视频（每日更新）</b></p>';
        html += '<div class="list">' + allVideos.map((v) =>
          '<div class="row-item" style="background:#fff">' + XU.videoCard(v) + '</div>'
        ).join('') + '</div>';
      }
      if (!allVideos.length) html += '<div class="empty">该章节视频更新中…</div>';
      html += '</div>';
      return html;
    }

    renderChapters();
    list.addEventListener('click', (e) => {
      const head = e.target.closest('[data-ch]');
      if (!head) return;
      const c = chapters[parseInt(head.getAttribute('data-ch'), 10)];
      if (!c) return;
      openId = openId === c.id ? null : c.id;
      renderChapters();
    });
  });
})();
