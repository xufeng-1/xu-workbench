# -*- coding: utf-8 -*-
"""probe_books2.py —— 验证搜索API阳性对照 + 古腾堡中文书目（带重试与限速）"""
import json, re, time, urllib.parse, urllib.request

UA = "Mozilla/5.0 (compatible; xu-probe/1.0)"
def http_get(url, timeout=40, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception as e:
            last = e
            if isinstance(e, urllib.error.HTTPError) and e.code == 429:
                time.sleep(6 + i * 4)
                continue
            raise
    raise last

def search(t):
    url = ("https://zh.wikisource.org/w/api.php?action=query&list=search&srsearch=%s"
           "&srwhat=title&srlimit=6&format=json") % urllib.parse.quote(t, safe="")
    data = json.loads(http_get(url))
    hits = [h.get("title") for h in (data.get("query", {}).get("search", []) or [])]
    print("SRC|%s|%s" % (t, " ;; ".join(hits)))
    time.sleep(2)

print("== positive controls ==")
for t in ["呐喊", "駱駝祥子", "朝花夕拾", "茶花女"]:
    try: search(t)
    except Exception as e: print("SRCERR|%s|%s|%s" % (t, type(e).__name__, str(e)[:100]))

print("== failing titles ==")
for t in ["彷徨", "月牙儿", "寄小读者", "野草", "繁星", "八十日環遊地球", "阿麗思漫遊奇境記", "魯濱孫漂流記", "安徒生童話", "格林童話"]:
    try: search(t)
    except Exception as e: print("SRCERR|%s|%s|%s" % (t, type(e).__name__, str(e)[:100]))

print("== gutenberg zh ==")
try:
    html = http_get("https://www.gutenberg.org/browse/languages/zh")
    items = re.findall(r'href="/ebooks/(\d+)"[^>]*>([^<]+)</a>', html)
    for num, name in items[:80]:
        print("GUT|%s|%s" % (num, name.strip()))
except Exception as e:
    print("GUTERR|%s|%s" % (type(e).__name__, str(e)[:150]))