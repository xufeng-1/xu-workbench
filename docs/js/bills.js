/* bills.js —— 微信/支付宝账单自动识别导入（CSV / ZIP），自动分类统计 */
(function () {
  const XU = window.XU || {};
  const B = {};

  /* ---------- CSV 解析 ---------- */
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, '').replace(/\r/g, '');
    const rows = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQ = false;
        } else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.length > 1 && r.some((x) => String(x).trim() !== ''));
  }

  /* ---------- DEFLATE 解压（RFC1951）---------- */
  function inflateRaw(u8) {
    let pos = 0, bitBuf = 0, bitCnt = 0;
    function bits(n) {
      while (bitCnt < n) { bitBuf |= u8[pos++] << bitCnt; bitCnt += 8; }
      const v = bitBuf & ((1 << n) - 1);
      bitBuf >>>= n; bitCnt -= n;
      return v;
    }
    function buildLookup(lengths) {
      const items = [];
      lengths.forEach((l, s) => { if (l) items.push([l, s]); });
      items.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const map = new Map();
      let code = 0, prevLen = 0, maxBits = 0;
      for (const [l, s] of items) {
        code <<= (l - prevLen); prevLen = l;
        if (l > maxBits) maxBits = l;
        map.set((code << 16) | l, s);
        code++;
      }
      return { map, maxBits };
    }
    function decodeSym(t) {
      let code = 0;
      for (let len = 1; len <= t.maxBits; len++) {
        code = (code << 1) | bits(1);
        const hit = t.map.get((code << 16) | len);
        if (hit !== undefined) return hit;
      }
      throw new Error('huffman');
    }
    const LEN_BASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
    const LEN_EXTRA = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    const DIST_BASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    const DIST_EXTRA = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
    const CLEN_ORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
    const out = [];
    let final = false;
    function decompressBlock(lt, dt) {
      for (;;) {
        const sym = decodeSym(lt);
        if (sym < 256) { out.push(sym); continue; }
        if (sym === 256) return;
        const li = sym - 257;
        const len = LEN_BASE[li] + bits(LEN_EXTRA[li]);
        const di = decodeSym(dt);
        const dist = DIST_BASE[di] + bits(DIST_EXTRA[di]);
        for (let i = 0; i < len; i++) out.push(out[out.length - dist]);
      }
    }
    while (!final) {
      final = bits(1) === 1;
      const type = bits(2);
      if (type === 0) {
        bitBuf = 0; bitCnt = 0;
        const len = u8[pos] | (u8[pos + 1] << 8); pos += 2; pos += 2;
        for (let i = 0; i < len; i++) out.push(u8[pos++]);
      } else if (type === 1) {
        const lt = buildLookup((function () {
          const a = new Array(288).fill(0);
          for (let i = 0; i < 144; i++) a[i] = 8;
          for (let i = 144; i < 256; i++) a[i] = 9;
          for (let i = 256; i < 280; i++) a[i] = 7;
          for (let i = 280; i < 288; i++) a[i] = 8;
          return a;
        })());
        decompressBlock(lt, buildLookup(new Array(30).fill(5)));
      } else if (type === 2) {
        const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
        const cl = new Array(19).fill(0);
        for (let i = 0; i < hclen; i++) cl[CLEN_ORDER[i]] = bits(3);
        const ct = buildLookup(cl);
        const lens = [];
        while (lens.length < hlit + hdist) {
          const sym = decodeSym(ct);
          if (sym < 16) lens.push(sym);
          else if (sym === 16) { const p = lens[lens.length - 1]; for (let i = 0, n = 3 + bits(2); i < n; i++) lens.push(p); }
          else if (sym === 17) { for (let i = 0, n = 3 + bits(3); i < n; i++) lens.push(0); }
          else { for (let i = 0, n = 11 + bits(7); i < n; i++) lens.push(0); }
        }
        decompressBlock(buildLookup(lens.slice(0, hlit)), buildLookup(lens.slice(hlit)));
      }
    }
    return new Uint8Array(out);
  }

  /* ---------- ZIP 解析（Store/Deflate，取 CSV）---------- */
  function decodeText(bytes) {
    let s = '';
    try { s = new TextDecoder('utf-8').decode(bytes); } catch (e) { s = ''; }
    if ((s.match(/\uFFFD/g) || []).length > 3) {
      try { s = new TextDecoder('gbk').decode(bytes); } catch (e) {}
    }
    return s;
  }
  function unzip(u8) {
    const files = [];
    let pos = 0;
    while (pos + 4 <= u8.length) {
      const sig = (u8[pos] | (u8[pos + 1] << 8) | (u8[pos + 2] << 16) | (u8[pos + 3] << 24)) >>> 0;
      if (sig === 0x04034b50) {
        const method = u8[pos + 8] | (u8[pos + 9] << 8);
        const compSize = (u8[pos + 18] | (u8[pos + 19] << 8) | (u8[pos + 20] << 16) | (u8[pos + 21] << 24)) >>> 0;
        const nameLen = u8[pos + 26] | (u8[pos + 27] << 8);
        const extraLen = u8[pos + 28] | (u8[pos + 29] << 8);
        const nameBytes = u8.subarray(pos + 30, pos + 30 + nameLen);
        const name = decodeText(nameBytes).replace(/\0/g, '');
        const dataStart = pos + 30 + nameLen + extraLen;
        const comp = u8.subarray(dataStart, dataStart + compSize);
        let raw = null;
        if (method === 0) raw = comp;
        else if (method === 8) { try { raw = inflateRaw(comp); } catch (e) { raw = null; } }
        if (raw) files.push({ name, text: decodeText(raw) });
        pos = dataStart + compSize;
      } else if (sig === 0x02014b50 || sig === 0x06054b50) break;
      else break;
    }
    return files;
  }

  /* ---------- 自动分类 ---------- */
  const OUT_RULES = [
    ['food', ['外卖','美团','饿了么','餐饮','美食','餐厅','茶','咖啡','奶茶','麦当劳','肯德基','海底捞','小吃','火锅','烧烤','面','蛋糕','水果','菜','饭','餐','饮品']],
    ['transport', ['滴滴','出行','地铁','公交','铁路','高铁','机票','加油','停车','高德','T3','曹操','打车','出租车','火车','单车','充电','ETC']],
    ['shopping', ['淘宝','天猫','京东','拼多多','唯品会','抖音','电商','超市','便利店','商场','商店','专卖','旗舰店','严选','名创','优衣库','耐克','NIKE','阿迪','鞋','服饰','百货']],
    ['fun', ['游戏','视频','会员','爱奇艺','腾讯视频','优酷','哔哩','网易云','音乐','唱','电影','KTV','直播','App','充值','点券','票']],
    ['home', ['房租','水电','物业','燃气','公寓','中介']],
    ['medical', ['医院','药房','药店','诊所','医疗','体检','口腔','挂号']],
    ['study', ['书','课程','网课','知识','培训','学而思','得到','专栏','考试']],
    ['phone', ['话费','流量','中国移动','中国联通','中国电信','宽带','手机充值','通信']]
  ];
  const IN_RULES = [
    ['salary', ['工资','薪水','薪金','代发','劳务']],
    ['bonus', ['奖金','年终','红包','福利']],
    ['invest', ['理财','收益','利息','基金','余额宝','分红']]
  ];
  function guessCat(text, type) {
    const t = String(text || '');
    const rules = type === 'in' ? IN_RULES : OUT_RULES;
    for (const [id, kws] of rules) {
      if (kws.some((k) => t.indexOf(k) >= 0)) return id;
    }
    return type === 'in' ? 'otherin' : 'other';
  }

  /* ---------- 微信账单解析 ---------- */
  function toAmount(s) {
    const m = String(s || '').replace(/[^\d.-]/g, '');
    const v = parseFloat(m);
    return isNaN(v) ? 0 : Math.abs(Math.round(v * 100) / 100);
  }
  function splitDT(s) {
    s = String(s || '').trim();
    const i = s.indexOf(' ');
    if (i > 0) {
      const d = s.slice(0, i).trim(), t = s.slice(i + 1).trim();
      return { date: d.replace(/\//g, '-'), time: t.slice(0, 5) };
    }
    return { date: s.slice(0, 10).replace(/\//g, '-'), time: '' };
  }
  function parseWechat(rows) {
    const out = [];
    let header = -1;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).indexOf('交易时间') === 0) { header = i; break; }
    }
    if (header < 0) return out;
    for (let i = header + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 6) continue;
      const flag = String(r[4] || '').trim();
      if (flag !== '支出' && flag !== '收入') continue;
      const amt = toAmount(r[5]);
      if (!amt) continue;
      const dt = splitDT(r[0]);
      if (!dt.date) continue;
      const type = flag === '收入' ? 'in' : 'out';
      const noteTxt = String(r[3] || '') + (String(r[10] || '').trim() ? ' ' + String(r[10]).trim() : '');
      const counterparty = String(r[2] || '').trim();
      out.push({
        date: dt.date, time: dt.time, type: type,
        cat: guessCat(noteTxt + ' ' + counterparty, type),
        note: noteTxt, amount: amt,
        txn: String(r[8] || '').trim(), src: 'wechat'
      });
    }
    return out;
  }

  /* ---------- 支付宝账单解析 ---------- */
  function parseAlipay(rows) {
    const out = [];
    let header = -1;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).indexOf('交易时间') === 0 && String(rows[i][5]).indexOf('收/支') >= 0) { header = i; break; }
    }
    if (header < 0) return out;
    for (let i = header + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 7) continue;
      const flag = String(r[5] || '').trim();
      if (flag !== '支出' && flag !== '收入') continue;
      const amt = toAmount(r[6]);
      if (!amt) continue;
      const dt = splitDT(r[0]);
      if (!dt.date) continue;
      const type = flag === '收入' ? 'in' : 'out';
      const noteTxt = String(r[4] || '') + (String(r[11] || '').trim() ? ' ' + String(r[11]).trim() : '');
      const counterparty = String(r[2] || '').trim();
      out.push({
        date: dt.date, time: dt.time, type: type,
        cat: guessCat(noteTxt + ' ' + counterparty, type),
        note: noteTxt, amount: amt,
        txn: String(r[9] || '').trim(), src: 'alipay'
      });
    }
    return out;
  }

  /* ---------- 主解析入口：自动识别微信/支付宝 ---------- */
  function parseBill(text) {
    const rows = parseCSV(text);
    if (!rows.length) return { src: '', list: [], hint: '未识别到有效账单内容' };
    const joined = rows.map((r) => r.join(',')).join('\n');
    let list = [], src = '';
    if (joined.indexOf('微信支付账单') >= 0 || rows[0].indexOf('微信') >= 0) {
      src = 'wechat'; list = parseWechat(rows);
    } else if (joined.indexOf('支付宝') >= 0 || (rows[0] && String(rows[0][0]).indexOf('交易时间') === 0)) {
      const w = parseWechat(rows), a = parseAlipay(rows);
      if (w.length && a.length) { list = a.length >= w.length ? a : w; src = a.length >= w.length ? 'alipay' : 'wechat'; }
      else if (a.length) { list = a; src = 'alipay'; }
      else if (w.length) { list = w; src = 'wechat'; }
    }
    if (!list.length) return { src: '', list: [], hint: '账单内没有可导入的收支记录（支出/收入为空）' };
    return { src, list, hint: '' };
  }
  B.parseBill = parseBill;
  B.unzip = unzip;
  B.parseCSV = parseCSV;

  /* ---------- 导入 UI ---------- */
  function srcLabel(s) { return s === 'wechat' ? '微信' : s === 'alipay' ? '支付宝' : ''; }

  async function doImport(list, src) {
    const existing = await XU.Store.all('money');
    const seen = new Set(existing.map((e) => e.txn).filter(Boolean));
    let added = 0, dup = 0;
    for (const it of list) {
      if (it.txn && seen.has(it.txn)) { dup++; continue; }
      if (it.txn) seen.add(it.txn);
      await XU.Store.set('money', {
        id: 'b' + Date.now() + Math.random().toString(36).slice(2, 6),
        date: it.date, time: it.time, type: it.type, cat: it.cat,
        note: it.note, amount: it.amount, txn: it.txn, src: it.src || src
      });
      added++;
    }
    return { added, dup };
  }

  function showPreview(parsed) {
    const list = parsed.list || [];
    const outAmt = list.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0);
    const inAmt = list.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0);
    const cats = {};
    list.forEach((e) => { cats[e.cat] = (cats[e.cat] || 0) + e.amount; });
    const catHtml = Object.keys(cats).sort((a, b) => cats[b] - cats[a]).slice(0, 6)
      .map((c) => '<span class="chip">' + XU.catIcon(c) + ' ' + XU.catLabel(c) + ' ' + XU.money(cats[c]) + '</span>').join('');
    XU.modal(
      '<h3>📄 账单识别结果</h3>' +
      '<p class="sub">来源：' + (srcLabel(parsed.src) || '未知') + ' · 共识别 <b>' + list.length + '</b> 笔（支出 ' + XU.money(outAmt) + ' / 收入 ' + XU.money(inAmt) + '）</p>' +
      (catHtml ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px">' + catHtml + '</div>' : '') +
      '<div class="sub" style="color:var(--muted)">导入后自动合并到本月统计，可随时删除。同一笔不会重复导入。</div>' +
      '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">导入 ' + list.length + ' 笔</button></div>',
      { onMount: (mask, close) => {
        XU.$('[data-x=no]', mask).onclick = close;
        XU.$('[data-x=yes]', mask).onclick = async () => {
          const r = await doImport(list, parsed.src);
          close();
          XU.toast('已导入 ' + r.added + ' 笔' + (r.dup ? '，跳过重复 ' + r.dup + ' 笔' : '') + ' ✔');
          XU.route();
        };
      } }
    );
  }

  function pickFile() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.csv,.zip,text/csv,application/zip,application/octet-stream';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        const bytes = new Uint8Array(fr.result);
        let parsed = null;
        const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
        if (isZip) {
          const files = unzip(bytes);
          const csv = files.filter((x) => /\.csv$/i.test(x.name));
          const target = csv[0] || files[0];
          if (target) parsed = parseBill(target.text);
          else parsed = { src: '', list: [], hint: '压缩包内未找到账单 CSV 文件（请用「用于个人对账」导出）' };
        } else {
          parsed = parseBill(decodeText(bytes));
        }
        if (parsed.list && parsed.list.length) showPreview(parsed);
        else XU.toast(parsed.hint || '未识别到账单内容');
      };
      fr.readAsArrayBuffer(f);
    };
    inp.click();
  }

  /* 粘贴文本方式（微信/支付宝导出的 CSV 内容） */
  function pasteText() {
    XU.modal(
      '<h3>📋 粘贴账单文本</h3>' +
      '<p class="sub">在微信/支付宝导出账单后用文本方式打开，复制内容粘贴到这里</p>' +
      '<textarea id="billText" rows="6" style="width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:12px;padding:10px;font-size:12.5px;resize:vertical" placeholder="粘贴 CSV 内容…"></textarea>' +
      '<div class="actions"><button class="btn ghost" data-x="no">取消</button><button class="btn" data-x="yes">开始识别</button></div>',
      { onMount: (mask, close) => {
        XU.$('[data-x=no]', mask).onclick = close;
        XU.$('[data-x=yes]', mask).onclick = () => {
          const text = XU.$('#billText', mask).value;
          if (!text.trim()) { XU.toast('请先粘贴内容'); return; }
          const parsed = parseBill(text);
          close();
          if (parsed.list && parsed.list.length) showPreview(parsed);
          else XU.toast(parsed.hint || '未识别到账单内容');
        };
      } }
    );
  }

  B.open = function () {
    XU.modal(
      '<h3>📥 导入微信/支付宝账单</h3>' +
      '<p class="sub">第一步：在微信/支付宝 App 里导出账单（微信：我→服务→钱包→账单→常见问题→下载账单，选「用于个人对账」；支付宝：我的→账单→…→开具交易流水证明→下载）。</p>' +
      '<p class="sub">第二步：把导出的文件（CSV 或 ZIP）导入到这里，自动识别来源、自动分类、自动统计。</p>' +
      '<div class="actions" style="flex-direction:column">' +
        '<button class="btn" id="bFile" style="width:100%">📁 选择账单文件（CSV / ZIP）</button>' +
        '<button class="btn ghost" id="bPaste" style="width:100%">📋 粘贴账单文本</button>' +
        '<button class="btn ghost" data-x="no" style="width:100%">取消</button>' +
      '</div>',
      { onMount: (mask, close) => {
        XU.$('#bFile', mask).onclick = () => { close(); pickFile(); };
        XU.$('#bPaste', mask).onclick = () => { close(); pasteText(); };
        XU.$('[data-x=no]', mask).onclick = close;
      } }
    );
  };
  B.srcLabel = srcLabel;
  XU.bills = B;
})();
