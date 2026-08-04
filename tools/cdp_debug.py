# -*- coding: utf-8 -*-
"""cdp_debug.py —— 通过 CDP 查看页面运行时状态"""
import base64, json, os, socket, struct, subprocess, sys, time, urllib.request
from urllib.parse import urlparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp_shot2 import WS, EDGE, PORT, PROFILE

def main():
    url = sys.argv[1]
    proc = subprocess.Popen(
        [EDGE, "--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=%d" % PORT,
         "--user-data-dir=" + PROFILE, "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(30):
            try:
                targets = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/json/list" % PORT, timeout=3).read())
                page = [t for t in targets if t.get("type") == "page"][0]
                break
            except Exception:
                time.sleep(0.5)
        ws = WS(page["webSocketDebuggerUrl"])
        ws.cmd("Page.enable")
        ws.cmd("Page.navigate", {"url": url})
        time.sleep(8)
        res = ws.cmd("Runtime.evaluate", {"expression": "JSON.stringify({title: document.title, contentLen: (document.getElementById('content')||{innerHTML:''}).innerHTML.length, contentHead: (document.getElementById('content')||{innerHTML:''}).innerHTML.slice(0,120), nav: document.querySelectorAll('.nav-item').length})", "returnByValue": True})
        print("STATE:", res.get("result", {}).get("result", {}).get("value"))
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
