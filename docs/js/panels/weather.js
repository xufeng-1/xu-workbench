/* panels/weather.js —— 天气：实时天气 + 7 日预报 + 城市搜索（Open-Meteo 免费接口，无需密钥） */
(function () {
  const XU = window.XU;

  const WMO = {
    0: ['晴', '☀️'], 1: ['大部晴朗', '🌤️'], 2: ['多云', '⛅'], 3: ['阴', '☁️'],
    45: ['雾', '🌫️'], 48: ['冻雾', '🌫️'],
    51: ['小毛毛雨', '🌦️'], 53: ['毛毛雨', '🌦️'], 55: ['大毛毛雨', '🌧️'],
    56: ['冻毛毛雨', '🌧️'], 57: ['强冻毛毛雨', '🌧️'],
    61: ['小雨', '🌧️'], 63: ['中雨', '🌧️'], 65: ['大雨', '🌧️'],
    66: ['冻雨', '🌧️'], 67: ['强冻雨', '🌧️'],
    71: ['小雪', '🌨️'], 73: ['中雪', '🌨️'], 75: ['大雪', '❄️'], 77: ['雪粒', '❄️'],
    80: ['小阵雨', '🌦️'], 81: ['阵雨', '🌧️'], 82: ['强阵雨', '⛈️'],
    85: ['小阵雪', '🌨️'], 86: ['大阵雪', '❄️'],
    95: ['雷阵雨', '⛈️'], 96: ['雷雨伴冰雹', '⛈️'], 99: ['强雷雨伴冰雹', '⛈️']
  };
  const DEFAULT = { name: '北京', lat: 39.9042, lon: 116.4074 };
  const KEY = 'weather_city';

  function wmoInfo(code) { return WMO[code] || ['未知', '🌡️']; }
  function esc(s) { return XU.esc(s); }
  function weekday(i) { return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][i]; }

  async function getCity() {
    try { const c = await XU.Store.kvGet(KEY); if (c && c.lat) return c; } catch (e) {}
    return DEFAULT;
  }
  async function saveCity(c) { try { await XU.Store.kvSet(KEY, c); } catch (e) {} }

  async function fetchGeo(q) {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=8&language=zh&format=json';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    let res;
    try { res = await fetch(url, { signal: ctrl.signal }); } finally { clearTimeout(timer); }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    return d.results || [];
  }

  async function fetchWeather(lat, lon) {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&' +
      'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    let res;
    try { res = await fetch(url, { signal: ctrl.signal }); } finally { clearTimeout(timer); }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  function loc() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ name: '我的位置', lat: p.coords.latitude, lon: p.coords.longitude }),
        () => resolve(null),
        { timeout: 6000, maximumAge: 600000 }
      );
    });
  }

  function currentCard(cur, city) {
    const [txt, emo] = wmoInfo(cur.weather_code);
    return '<div class="weather-now">' +
      '<div style="font-size:44px;line-height:1">' + emo + '</div>' +
      '<div style="flex:1;min-width:0"><div class="w-city">' + esc(city.name || city.lat.toFixed(2) + ',' + city.lon.toFixed(2)) + '</div>' +
      '<div class="w-temp">' + Math.round(cur.temperature_2m) + '°C <span class="w-desc">' + txt + '</span></div>' +
      '<div class="w-meta">体感 ' + Math.round(cur.apparent_temperature) + '°C · 湿度 ' + Math.round(cur.relative_humidity_2m) + '% · 风速 ' + cur.wind_speed_10m.toFixed(1) + ' km/h</div></div>' +
      '<button class="btn mini" id="wRelocate">📍</button></div>';
  }

  function dailyRow(d, i) {
    const [txt, emo] = wmoInfo(d.weather_code[i]);
    const date = new Date(d.time[i] + 'T00:00:00');
    return '<div class="w-day' + (i === 0 ? ' today' : '') + '">' +
      '<div class="w-day-name">' + (i === 0 ? '今天' : weekday(date.getDay())) + '</div>' +
      '<div class="w-day-emo">' + emo + '</div>' +
      '<div class="w-day-txt">' + txt + '</div>' +
      '<div class="w-day-rain">' + (d.precipitation_probability_max[i] != null ? '💧' + d.precipitation_probability_max[i] + '%' : '') + '</div>' +
      '<div class="w-day-temp"><b>' + Math.round(d.temperature_2m_max[i]) + '°</b> / ' + Math.round(d.temperature_2m_min[i]) + '°</div></div>';
  }

  XU.regPanel('weather', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    el.innerHTML = '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">⛅ 天气</h2><p style="margin:0;font-size:12.5px;opacity:.92">实时天气 · 7 日预报 · 每日自动更新</p></div>' +
      '<div class="card"><div style="display:flex;gap:8px;margin-bottom:12px">' +
      '<input class="input" id="wCity" placeholder="搜索城市，如：成都 / 拉萨 / 大理" style="flex:1">' +
      '<button class="btn" id="wSearch">搜索</button></div>' +
      '<div id="wSug" class="w-sug"></div>' +
      '<div id="wBody"><p class="sub">正在获取天气…</p></div></div>';

    let city = await getCity();
    let sugs = [];

    async function load() {
      const body = XU.$('#wBody', el);
      try {
        const d = await fetchWeather(city.lat, city.lon);
        let html = currentCard(d.current, city);
        html += '<div class="w-week">';
        for (let i = 0; i < d.daily.time.length; i++) html += dailyRow(d.daily, i);
        html += '</div>';
        html += '<p class="sub" style="margin-top:10px">数据来源 Open-Meteo（免费公开接口）· 每小时自动更新</p>';
        body.innerHTML = html;
        XU.$('#wRelocate', el).onclick = async () => {
          const p = await loc();
          if (!p) { XU.toast('无法获取定位，请检查手机定位权限'); return; }
          city = p; await saveCity(city); XU.toast('已定位到当前位置'); load();
        };
      } catch (e) {
        body.innerHTML = '<p class="sub">天气获取失败（可能处于离线状态）。请联网后重试，或换个城市搜索。</p>' +
          '<button class="btn" id="wRetry">重试</button>';
        const b = XU.$('#wRetry', el);
        if (b) b.onclick = load;
      }
    }

    async function doSearch() {
      const q = XU.$('#wCity', el).value.trim();
      if (!q) return;
      const sug = XU.$('#wSug', el);
      try {
        sugs = await fetchGeo(q);
        if (!sugs.length) { sug.innerHTML = '<p class="sub">未找到该城市，试试输入省/市名</p>'; return; }
        sug.innerHTML = sugs.map((s, i) =>
          '<button class="chip w-chip" data-i="' + i + '">' + esc(s.name + (s.admin1 ? ' · ' + s.admin1 : '') + (s.country ? ' · ' + s.country : '')) + '</button>'
        ).join('');
        sug.querySelectorAll('.w-chip').forEach((b) => b.onclick = () => {
          const s = sugs[+b.getAttribute('data-i')];
          city = { name: s.name + (s.admin1 ? ' · ' + s.admin1 : ''), lat: s.latitude, lon: s.longitude };
          saveCity(city);
          sug.innerHTML = '';
          XU.$('#wCity', el).value = '';
          load();
        });
      } catch (e) {
        sug.innerHTML = '<p class="sub">搜索失败，请检查网络</p>';
      }
    }

    XU.$('#wSearch', el).onclick = doSearch;
    XU.$('#wCity', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    load();
  });
})();