# -*- coding: utf-8 -*-
"""cdp_shot3.py —— 强制重绘后连续截图两次，取第二次（确保捕获已渲染帧）"""
import base64, json, os, socket, struct, subprocess, sys, time, urllib.request
from urllib.parse import urlparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cdp_shot2 as M

def main():
    url = sys.argv[1]; out = sys.argv[2]
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 390
    height = int(sys.argv[4]) if len(sys.argv) > 4 else 1200
    wait = float(sys.argv[5]) if len(sys.argv) > 5 else 10
    proc = subprocess.Popen(
        [M.EDGE, "--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=%d" % M.PORT,
         "--user-data-dir=" + M.PROFILE, "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(30):
            try:
                targets = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/json/list" % M.PORT, timeout=3).read())
                page = [t for t in targets if t.get("type") == "page"][0]
                break
            except Exception:
                time.sleep(0.5)
        ws = M.WS(page["webSocketDebuggerUrl"])
        ws.cmd("Page.enable")
        ws.cmd("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
        ws.cmd("Page.navigate", {"url": url})
        time.sleep(wait)
        # 强制重绘
        ws.cmd("Runtime.evaluate", {"expression": "window.scrollTo(0,1);"})
        time.sleep(0.5)
        ws.cmd("Runtime.evaluate", {"expression": "window.scrollTo(0,0);"})
        time.sleep(1)
        ws.cmd("Page.captureScreenshot", {"format": "png"})
        time.sleep(0.5)
        res = ws.cmd("Page.captureScreenshot", {"format": "png"})
        with open(out, "wb") as f:
            f.write(base64.b64decode(res["result"]["data"]))
        print("saved:", out)
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
