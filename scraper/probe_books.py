# -*- coding: utf-8 -*-
"""probe_books.py —— 一次性探测：维基文库真实标题 + 古腾堡中文书目"""
import json, re, urllib.parse, urllib.request

def http_get(url, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; xu-probe/1.0)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")

def main():
    titles = ["彷徨", "故事新编", "月牙儿", "沉沦", "寄小读者", "野草", "繁星", "春水",
              "尝试集", "志摩的诗", "八十日環遊地球", "阿麗思漫遊奇境記", "魯濱孫漂流記",
              "安徒生童話", "格林童話", "小王子", "茶花女", "呐喊", "駱駝祥子"]
    print("== wikisource title search ==")
    for t in titles:
        try:
            url = ("https://zh.wikisource.org/w/api.php?action=query&list=search&srsearch=%s"
                   "&srwhat=title&srlimit=6&format=json") % urllib.parse.quote(t, safe="")
            data = json.loads(http_get(url))
            hits = [h.get("title") for h in (data.get("query", {}).get("search", []) or [])]
            print("SRC|%s|%s" % (t, " ;; ".join(hits)))
        except Exception as e:
            print("SRCERR|%s|%s|%s" % (t, type(e).__name__, str(e)[:100]))
    print("== gutenberg zh ==")
    try:
        html = http_get("https://www.gutenberg.org/browse/languages/zh")
        items = re.findall(r'href="/ebooks/(\d+)"[^>]*>([^<]+)</a>', html)
        for num, name in items[:80]:
            print("GUT|%s|%s" % (num, name.strip()))
    except Exception as e:
        print("GUTERR|%s|%s" % (type(e).__name__, str(e)[:150]))

if __name__ == "__main__":
    main()