# -*- coding: utf-8 -*-
"""probe_books3.py —— 用 action=query&titles 批量验证页面是否存在（带限速防429）"""
import json, time, urllib.parse, urllib.request, urllib.error

UA = "Mozilla/5.0 (compatible; xu-probe/1.0)"
def http_get(url, timeout=40, tries=4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception as e:
            last = e
            if isinstance(e, urllib.error.HTTPError) and e.code == 429:
                time.sleep(8 + i * 5)
                continue
            raise
    raise last

def exists(title):
    url = ("https://zh.wikisource.org/w/api.php?action=query&titles=%s&format=json&redirects=1"
           % urllib.parse.quote(title, safe=""))
    data = json.loads(http_get(url))
    pages = data.get("query", {}).get("pages", {}) or {}
    for pid, p in pages.items():
        if pid == "-1" or p.get("missing"):
            return False, p.get("title", title)
        return True, p.get("title", title)
    return False, title

cands = [
    "三國演義", "西遊記", "水滸傳", "紅樓夢",
    "徬徨", "吶喊", "故事新編", "沉淪", "月牙兒", "寄小讀者", "野草", "繁星", "春水", "嘗試集", "志摩的詩",
    "簡·愛", "愛的教育", "伊索寓言", "湯姆叔叔的小屋", "木偶奇遇記",
    "阿麗思漫遊奇境記", "八十日環遊地球", "魯濱孫漂流記", "安徒生童話", "格林童話",
    "巴黎茶花女遺事", "茶花女", "駱駝祥子", "朝花夕拾", "背影", "荷塘月色", "熱風", "而已集", "華蓋集", "彷徨"
]
for t in cands:
    try:
        ok, real = exists(t)
        print("CHK|%s|%s|%s" % ("YES" if ok else "NO ", t, real))
    except Exception as e:
        print("CHKERR|%s|%s|%s" % (t, type(e).__name__, str(e)[:80]))
    time.sleep(1.8)