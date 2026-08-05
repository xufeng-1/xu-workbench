/* tts.js —— 系统真实语音朗读（单词/短句优先，在线发音多源兜底） */
(function () {
  const TTS = {
    speaking: false,
    _audio: null,
    supported() { return 'speechSynthesis' in window; },
    pick() {
      if (!this.supported()) return null;
      const vs = speechSynthesis.getVoices();
      if (!vs || !vs.length) return null;
      const zh = vs.find((v) => /zh-CN|zh_CN|Chinese/i.test(v.lang + ' ' + v.name));
      const en = vs.find((v) => /en(-|_)US/i.test(v.lang + ' ' + v.name)) || vs.find((v) => /^en/i.test(v.lang));
      return { zh: zh || null, en: en || null };
    },
    /* 在线发音源：有道 → 百度 → Google（多路兜底） */
    _onlineUrls(text, lang) {
      const t = encodeURIComponent(text);
      const urls = [];
      if (lang === 'en') {
        urls.push('https://dict.youdao.com/dictvoice?audio=' + t + '&type=2&le=en');
        urls.push('https://fanyi.baidu.com/gettts?lan=en&text=' + t + '&spd=3&source=web');
        urls.push('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=' + t);
      } else {
        urls.push('https://dict.youdao.com/dictvoice?audio=' + t + '&type=1&le=zh');
        urls.push('https://fanyi.baidu.com/gettts?lan=zh&text=' + t + '&spd=3&source=web');
      }
      return urls;
    },
    playOnline(text, lang) {
      const urls = this._onlineUrls(text, lang);
      return new Promise((resolve) => {
        let i = 0, started = false;
        const next = () => {
          if (started || i >= urls.length) { if (!started) resolve(false); return; }
          const a = new Audio();
          a.preload = 'auto';
          a.src = urls[i++];
          this._audio = a;
          let settled = false, timer = null;
          const fail = () => { if (settled) return; settled = true; clearTimeout(timer); a.src = ''; next(); };
          a.onerror = fail;
          a.onstalled = fail;
          timer = setTimeout(fail, 4000);
          a.oncanplay = () => {
            if (settled) return;
            settled = true; clearTimeout(timer);
            started = true;
            const pr = a.play();
            if (pr && pr.then) pr.then(() => resolve(true)).catch(() => resolve(true));
            else resolve(true);
          };
        };
        next();
      });
    },
    /* 唤醒音频焦点：修复部分安卓机型系统语音无声音 */
    _pokeAudio() {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const src = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        src.connect(gain); gain.connect(ctx.destination);
        src.start(0);
        setTimeout(() => { try { src.stop(); ctx.close(); } catch (e) {} }, 80);
      } catch (e) {}
    },
    _warmVoices() {
      try { if (this.supported()) speechSynthesis.getVoices(); } catch (e) {}
    },
    _speech(text, lang, rate) {
      return new Promise((resolve) => {
        let fired = false, timer = null;
        const done = (ok) => {
          if (fired) return;
          fired = true;
          if (timer) clearTimeout(timer);
          this.speaking = false;
          resolve(ok);
        };
        try { speechSynthesis.cancel(); } catch (e) {}
        this._pokeAudio();
        try { speechSynthesis.resume(); } catch (e) {}
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'en' ? 'en-US' : 'zh-CN';
        u.rate = rate || 1;
        u.pitch = 1;
        u.onend = () => done(true);
        u.onerror = () => done(false);
        /* 2.5 秒内未开始发声则判定无声音，交给在线兜底 */
        timer = setTimeout(() => { if (!fired) { done(false); try { speechSynthesis.cancel(); } catch (e) {} } }, 2500);
        const go = () => {
          if (fired) return;
          const v = this.pick();
          if (v) u.voice = lang === 'en' ? (v.en || v.zh) : (v.zh || v.en);
          this.speaking = true;
          try { speechSynthesis.speak(u); } catch (e) { done(false); return; }
          setTimeout(() => { try { speechSynthesis.resume(); } catch (e) {} }, 300);
        };
        const vs = speechSynthesis.getVoices();
        if (vs && vs.length) go();
        else {
          let waited = 0;
          const iv = setInterval(() => {
            waited += 100;
            const now = speechSynthesis.getVoices();
            if ((now && now.length) || waited >= 1500) { clearInterval(iv); go(); }
          }, 100);
        }
      });
    },
    /* 朗读：一律先系统语音（含安卓主屏幕），无声音再自动切在线发音 */
    speak(text, lang, rate) {
      if (!text) return Promise.resolve(false);
      this._warmVoices();
      if (!this.supported()) return this.playOnline(text, lang);
      return this._speech(text, lang, rate).then((ok) => {
        if (!ok) return this.playOnline(text, lang);
        return true;
      });
    },
    stop() {
      this.speaking = false;
      if (this._audio) {
        try { this._audio.pause(); this._audio.src = ''; } catch (e) {}
        this._audio = null;
      }
      if (this.supported()) { try { speechSynthesis.cancel(); } catch (e) {} }
    }
  };
  /* 首屏预热语音列表（部分安卓需要用户交互后才加载） */
  document.addEventListener('touchstart', function warm() {
    try { if ('speechSynthesis' in window) speechSynthesis.getVoices(); } catch (e) {}
    document.removeEventListener('touchstart', warm);
  }, { passive: true });
  window.XU = window.XU || {};
  XU.TTS = TTS;
})();
