/* panels/sounds.js —— 白噪音：雨声/海浪/篝火/风扇/森林/粉红噪音（Web Audio 实时合成，离线可用） */
(function () {
  const XU = window.XU;
  let ctx = null;
  let nodes = [];
  let current = null;
  let timer = null;

  const SOUNDS = [
    { id: 'rain', name: '雨声', emoji: '🌧️', desc: '绵绵细雨，助眠放松' },
    { id: 'ocean', name: '海浪', emoji: '🌊', desc: '潮起潮落，舒缓心情' },
    { id: 'fire', name: '篝火', emoji: '🔥', desc: '噼啪柴火，温暖安静' },
    { id: 'fan', name: '风扇', emoji: '🌀', desc: '平稳风声，屏蔽干扰' },
    { id: 'forest', name: '森林', emoji: '🌲', desc: '虫鸣鸟叫，自然白噪' },
    { id: 'pink', name: '粉红噪音', emoji: '🎛️', desc: '均衡柔和的降噪声' }
  ];

  function ensureCtx() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function makeNoiseBuffer(seconds, type) {
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, rate * seconds, rate);
    const ch = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < ch.length; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'pink') {
        // 近似粉红噪音（Paul Kellet 简化算法）
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        ch[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else if (type === 'brown') {
        last = (last + 0.02 * white) / 1.02;
        ch[i] = last * 3.5;
      } else {
        ch[i] = white;
      }
    }
    return buf;
  }

  function stopAll() {
    nodes.forEach((n) => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (e) {} });
    nodes = [];
    if (timer) { clearInterval(timer); timer = null; }
    current = null;
  }

  function playSound(id) {
    const c = ensureCtx();
    if (!c) { XU.toast('当前设备不支持音频'); return; }
    stopAll();
    const master = c.createGain();
    master.gain.value = 0.55;
    master.connect(c.destination);
    nodes.push(master);

    if (id === 'rain') {
      const src = c.createBufferSource();
      src.buffer = makeNoiseBuffer(6, 'white');
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 300;
      src.connect(hp); hp.connect(lp); lp.connect(master);
      src.start(); nodes.push(src, lp, hp);
    } else if (id === 'ocean') {
      const src = c.createBufferSource();
      src.buffer = makeNoiseBuffer(8, 'white');
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 700;
      const g = c.createGain(); g.gain.value = 0.5;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
      const lfoG = c.createGain(); lfoG.gain.value = 0.28;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(lp); lp.connect(g); g.connect(master);
      src.start(); lfo.start(); nodes.push(src, lp, g, lfo, lfoG);
    } else if (id === 'fire') {
      const src = c.createBufferSource();
      src.buffer = makeNoiseBuffer(8, 'brown');
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 500;
      src.connect(lp); lp.connect(master); src.start(); nodes.push(src, lp);
      const crackle = c.createOscillator(); crackle.frequency.value = 0;
      const crackleG = c.createGain(); crackleG.gain.value = 0;
      crackle.connect(crackleG); crackleG.connect(master);
      crackle.start(); nodes.push(crackle, crackleG);
      timer = setInterval(() => {
        try {
          const t = c.currentTime;
          crackle.frequency.setValueAtTime(120 + Math.random() * 400, t);
          crackleG.gain.setValueAtTime(0, t);
          crackleG.gain.linearRampToValueAtTime(0.25, t + 0.01);
          crackleG.gain.exponentialRampToValueAtTime(0.0001, t + 0.06 + Math.random() * 0.08);
        } catch (e) {}
      }, 130);
    } else if (id === 'fan') {
      const src = c.createBufferSource();
      src.buffer = makeNoiseBuffer(6, 'white');
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      const osc = c.createOscillator(); osc.frequency.value = 100;
      const oscG = c.createGain(); oscG.gain.value = 0.03;
      src.connect(lp); lp.connect(master); osc.connect(oscG); oscG.connect(master);
      src.start(); osc.start(); nodes.push(src, lp, osc, oscG);
    } else if (id === 'forest') {
      const src = c.createBufferSource();
      src.buffer = makeNoiseBuffer(8, 'brown');
      src.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 850; bp.Q.value = 0.6;
      src.connect(bp); bp.connect(master); src.start(); nodes.push(src, bp);
      const chirp = c.createOscillator(); chirp.type = 'sine';
      const chirpG = c.createGain(); chirpG.gain.value = 0;
      chirp.connect(chirpG); chirpG.connect(master);
      chirp.start(); nodes.push(chirp, chirpG);
      timer = setInterval(() => {
        try {
          const t = c.currentTime;
          chirp.frequency.setValueAtTime(1800 + Math.random() * 1200, t);
          chirpG.gain.setValueAtTime(0, t);
          chirpG.gain.linearRampToValueAtTime(0.05, t + 0.02);
          chirpG.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        } catch (e) {}
      }, 700);
    } else if (id === 'pink') {
      const src = c.createBufferSource();
      src.buffer = makeNoiseBuffer(10, 'pink');
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 5200;
      src.connect(lp); lp.connect(master); src.start(); nodes.push(src, lp);
    }
    current = id;
  }

  XU.regPanel('sounds', async function (root) {
    const el = document.createElement('div');
    el.className = 'panel';
    root.appendChild(el);

    function render() {
      el.innerHTML =
        '<div class="hero"><h2 style="color:#fff;margin:0 0 4px">🎧 白噪音</h2><p style="margin:0;font-size:12.5px;opacity:.92">实时合成音效 · 专注 / 助眠 · 离线可用</p></div>' +
        '<div class="card"><div class="grid2">' + SOUNDS.map((s) =>
          '<button class="snd-card' + (current === s.id ? ' on' : '') + '" data-s="' + s.id + '">' +
          '<div class="snd-emo">' + s.emoji + '</div><div class="snd-name">' + s.name + '</div>' +
          '<div class="sub" style="font-size:11px">' + s.desc + '</div></button>').join('') + '</div>' +
          '<div class="actions" style="margin-top:12px">' +
          '<button class="btn" id="sndStop" style="flex:1">⏹ 停止声音</button></div>' +
          '<p class="sub" style="margin-top:8px;text-align:center">' + (current ? '正在播放：' + (SOUNDS.find((s) => s.id === current) || {}).name : '点击上方任意音效开始播放') + '</p></div>' +
        '<div class="card"><h2>💡 使用建议</h2><p class="sub">· 雨声、风扇适合睡前助眠<br>· 粉红噪音、森林适合办公专注<br>· 本页音效由设备实时合成，无需下载，完全离线</p></div>';

      XU.$$('.snd-card', el).forEach((b) => b.onclick = () => {
        playSound(b.getAttribute('data-s'));
        render();
      });
      XU.$('#sndStop', el).onclick = () => { stopAll(); render(); };
    }

    render();
    // 面板离开时自动停止
    const obs = new MutationObserver(() => {
      if (!document.body.contains(el)) {
        obs.disconnect();
        stopAll();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
})();