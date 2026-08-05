/* tts.js —— 系统真实语音朗读（安卓主屏幕模式自动切换在线发音） */
(function () {
  const TTS = {
    speaking: false,
    _audio: null,
    supported() { return 'speechSynthesis' in window; },
    /* 安卓「添加到主屏幕」独立窗口模式：系统语音已知会无声 */
    isAndroidStandalone() {
      if (!/Android/i.test(navigator.userAgent || '')) return false;
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    },
    pick() {
      if (!this.supported()) return null;
      const vs = speechSynthesis.getVoices();
      if (!vs.length) return null;
      const zh = vs.find((v) => /zh-CN|zh_CN|Chinese/i.test(v.lang + ' ' + v.name));
      const en = vs.find((v) => /en(-|_)US/i.test(v.lang));
      return { zh: zh || null, en: en || null };
    },
    /* 在线发音源：有道（单词/短语）→ 百度（整句） */
    _onlineUrls(text, lang) {
      const t = encodeURIComponent(text);
      const urls = [];
      if (lang === 'en') {
        urls.push('https://dict.youdao.com/dictvoice?audio=' + t + '&type=2');
        urls.push('https://fanyi.baidu.com/gettts?lan=en&text=' + t + '&spd=3&source=web');
      } else {
        urls.push('https://fanyi.baidu.com/gettts?lan=zh&text=' + t + '&spd=3&source=web');
      }
      return urls;
    },
    playOnline(text, lang) {
      const urls = this._onlineUrls(text, lang);
      return new Promise((resolve) => {
        let i = 0, started = false, timer = null;
        const next = () => {
          if (started || i >= urls.length) { if (!started) resolve(false); return; }
          const a = new Audio();
          a.preload = 'auto';
          a.src = urls[i++];
          this._audio = a;
          let settled = false;
          const fail = () => { if (settled) return; settled = true; clearTimeout(timer); next(); };
          a.onerror = fail;
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
    /* 唤醒音频焦点：修复安卓独立窗口系统语音无声的常见问题 */
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
    _speech(text, lang, rate) {
      return new Promise((resolve) => {
        let fired = false;
        let timer = null;
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
        u.onend = () => done(true);
        u.onerror = () => done(false);
        /* 2.5 秒内未开始发声则判定为无声，交给在线回退 */
        timer = setTimeout(() => { if (!fired) { done(false); try { speechSynthesis.cancel(); } catch (e) {} } }, 2500);
        const go = () => {
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
    speak(text, lang, rate) {
      if (!text) return Promise.resolve(false);
      /* 安卓独立窗口模式：系统语音已知无声，直接在线发音 */
      if (this.isAndroidStandalone()) {
        this.speaking = true;
        return this.playOnline(text, lang).then((ok) => { this.speaking = false; return ok; });
      }
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
  window.XU = window.XU || {};
  XU.TTS = TTS;
})();
