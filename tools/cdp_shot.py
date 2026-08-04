# -*- coding: utf-8 -*-
"""cdp_shot.py —— 通过 Chrome DevTools 协议精确截图（等待页面渲染完成后捕获）"""
import base64
import json
import os
import socket
import struct
import subprocess
import sys
import time
import urllib.request
from urllib.parse import urlparse

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9223
PROFILE = r"C:\Users\Thinkpad\Documents\Codex\2026-08-03\new-chat\work\xu-workbench\shots\edge-profile"


class WS:
    def __init__(self, url):
        u = urlparse(url)
        self.sock = socket.create_connection((u.hostname, u.port), timeout=15)
        key = base64.b64encode(os.urandom(16)).decode()
        path = u.path + (("?" + u.query) if u.query else "")
        req = ("GET %s HTTP/1.1\r\nHost: %s:%s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
               "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n") % (path, u.hostname, u.port, key)
        self.sock.sendall(req.encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.sock.recv(4096)
        self._id = 0

    def send(self, payload):
        data = payload if isinstance(payload, bytes) else payload.encode()
        mask = os.urandom(4)
        h = bytearray([0x81])
        n = len(data)
        if n < 126:
            h.append(0x80 | n)
        elif n < 65536:
            h.append(0x80 | 126)
            h += struct.pack(">H", n)
        else:
            h.append(0x80 | 127)
            h += struct.pack(">Q", n)
        h += mask
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.sock.sendall(bytes(h) + masked)

    def recv(self):
        h = self._recv_exact(2)
        if len(h) < 2:
            return None
        n = h[1] & 0x7F
        if n == 126:
            n = struct.unpack(">H", self._recv_exact(2))[0]
        elif n == 127:
            n = struct.unpack(">Q", self._recv_exact(8))[0]
        data = self._recv_exact(n)
        return json.loads(data.decode("utf-8", "ignore"))

    def _recv_exact(self, n):
        out = b""
        while len(out) < n:
            chunk = self.sock.recv(n - len(out))
            if not chunk:
                break
            out += chunk
        return out

    def cmd(self, method, params=None):
        self._id += 1
        self.send(json.dumps({"id": self._id, "method": method, "params": params or {}}))
        while True:
            msg = self.recv()
            if msg and msg.get("id") == self._id:
                return msg


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8899/test.html#/home"
    out = sys.argv[2] if len(sys.argv) > 2 else "shot.png"
    wait = float(sys.argv[3]) if len(sys.argv) > 3 else 9.0

    proc = subprocess.Popen(
        [EDGE, "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-software-rasterizer",
         "--remote-debugging-port=%d" % PORT, "--user-data-dir=" + PROFILE, "--window-size=390,844", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(30):
            try:
                targets = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/json/list" % PORT, timeout=3).read())
                page = [t for t in targets if t.get("type") == "page"][0]
                break
            except Exception:
                time.sleep(0.5)
        else:
            raise RuntimeError("CDP not ready")
        ws = WS(page["webSocketDebuggerUrl"])
        ws.cmd("Page.enable")
        ws.cmd("Page.navigate", {"url": target})
        time.sleep(wait)
        res = ws.cmd("Page.captureScreenshot", {"format": "png"})
        if "result" in res and "data" in res["result"]:
            with open(out, "wb") as f:
                f.write(base64.b64decode(res["result"]["data"]))
            print("saved:", out)
        else:
            print("capture failed:", json.dumps(res)[:200])
    finally:
        proc.terminate()


if __name__ == "__main__":
    main()
