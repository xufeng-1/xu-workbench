import http.server, socketserver, os, functools
root = r"C:\Users\Thinkpad\Documents\Codex\2026-08-03\new-chat\work\xu-workbench\docs"
os.chdir(root)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
with socketserver.TCPServer(("127.0.0.1", 8899), handler) as httpd:
    print("serving on 8899", flush=True)
    httpd.serve_forever()
