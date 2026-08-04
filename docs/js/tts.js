/* tts.js —— 系统真实语音朗读 */
(function () {
  const TTS = {
    speaking: false,
    supported() { return 'speechSynthesis' in window; },
    pick() {
      if (!this.supported()) return null;
      const vs = speechSynthesis.getVoices();
      if (!vs.length) return null;
      const zh = vs.find((v) => /zh-CN|zh_CN|Chinese/i.test(v.lang + ' ' + v.name));
      const en = vs.find((v) => /en(-|_)US/i.test(v.lang));
      return { zh: zh || null, en: en || null };
    },
    speak(text, lang, rate) {
      if (!this.supported() || !text) return Promise.reject(new Error('不支持语音'));
      return new Promise((resolve) => {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'en' ? 'en-US' : 'zh-CN';
        const v = this.pick();
        if (v) u.voice = lang === 'en' ? (v.en || v.zh) : (v.zh || v.en);
        u.rate = rate || 1;
        this.speaking = true;
        u.onend = () => { this.speaking = false; resolve(); };
        u.onerror = () => { this.speaking = false; resolve(); };
        speechSynthesis.speak(u);
      });
    },
    stop() { if (this.supported()) speechSynthesis.cancel(); this.speaking = false; }
  };
  window.XU = window.XU || {};
  XU.TTS = TTS;
})();
