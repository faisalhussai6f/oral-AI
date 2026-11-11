"""
OralAI — Pure Python Frontend Server
======================================
Serves the SPA (index.html + all static assets) on http://localhost:8080
No Node.js, PowerShell, or external tools required.

Usage (from the oral-health-ai folder):
    python serve.py             # default port 8080
    python serve.py --port 9090 # custom port

Start the Flask backend (Terminal 2):
    cd oral-health-ai\\backend
    python -m venv .venv
    .venv\\Scripts\\activate
    pip install -r requirements.txt
    python app.py

Works with any Python 3.6+
"""

import argparse
import mimetypes
import os
import sys
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

# ── MIME type overrides (Python's built-in table can be incomplete) ──────────
EXTRA_MIME = {
    ".js":    "application/javascript; charset=utf-8",
    ".mjs":   "application/javascript; charset=utf-8",
    ".json":  "application/json; charset=utf-8",
    ".css":   "text/css; charset=utf-8",
    ".html":  "text/html; charset=utf-8",
    ".htm":   "text/html; charset=utf-8",
    ".svg":   "image/svg+xml",
    ".webp":  "image/webp",
    ".png":   "image/png",
    ".jpg":   "image/jpeg",
    ".jpeg":  "image/jpeg",
    ".ico":   "image/x-icon",
    ".woff2": "font/woff2",
    ".woff":  "font/woff",
    ".ttf":   "font/ttf",
    ".txt":   "text/plain; charset=utf-8",
    ".md":    "text/plain; charset=utf-8",
}


class SPAHandler(SimpleHTTPRequestHandler):
    """
    Static-file handler with SPA fallback:
    - Serves any file that exists at the requested path.
    - Falls back to index.html for unknown paths (so the JS router works).
    - Adds CORS headers so the Flask backend on :5000 is reachable.
    - Suppresses verbose request logs (one clean line per request).
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ── Path resolution ──────────────────────────────────────────────────────
    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            # SPA fallback — serve index.html for anything that doesn't exist
            self.path = "/index.html"
        super().do_GET()

    # ── MIME type lookup ─────────────────────────────────────────────────────
    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in EXTRA_MIME:
            return EXTRA_MIME[ext]
        return super().guess_type(path)

    # ── Response headers ─────────────────────────────────────────────────────
    def end_headers(self):
        # CORS — allow the Flask backend and any local origin
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

        # Cache: no-cache for HTML and JS so changes appear immediately
        ext = os.path.splitext(self.path)[1].lower()
        if ext in (".html", ".js", ".json"):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma",         "no-cache")
            self.send_header("Expires",        "0")
        else:
            # Images, fonts, CSS — short-lived cache
            self.send_header("Cache-Control", "public, max-age=3600")

        super().end_headers()

    # ── Clean one-line log ───────────────────────────────────────────────────
    def log_message(self, fmt, *args):
        code  = args[1] if len(args) > 1 else "???"
        color = "\033[32m" if str(code).startswith("2") else \
                "\033[33m" if str(code).startswith("3") else "\033[31m"
        reset = "\033[0m"
        path  = args[0].split(" ")[1] if " " in args[0] else args[0]
        print(f"  {color}{code}{reset}  {path}")

    # ── Suppress the default stderr banner per request ───────────────────────
    def log_error(self, fmt, *args):
        pass  # silence "broken pipe" and other noise


def _open_browser(url: str, delay: float = 0.8):
    """Open the browser after a short delay so the server is ready."""
    import time
    time.sleep(delay)
    try:
        webbrowser.open(url)
    except Exception:
        pass


def run(port: int = 8080):
    global ROOT
    ROOT = os.path.dirname(os.path.abspath(__file__))   # folder containing serve.py

    # Verify index.html exists
    if not os.path.isfile(os.path.join(ROOT, "index.html")):
        print(f"\n  ✗  index.html not found in {ROOT}")
        print("     Make sure you run this script from the oral-health-ai folder.\n")
        sys.exit(1)

    url = f"http://localhost:{port}"
    server = HTTPServer(("", port), SPAHandler)

    print()
    print("  ╔══════════════════════════════════════════╗")
    print("  ║     OralAI — Python Frontend Server      ║")
    print("  ╠══════════════════════════════════════════╣")
    print(f"  ║  Frontend  →  {url:<27}║")
    print(f"  ║  Backend   →  http://localhost:5000      ║")
    print(f"  ║  Root      →  {ROOT:<27}║")
    print("  ║  Stop      →  Ctrl+C                     ║")
    print("  ╚══════════════════════════════════════════╝")
    print()

    # Open browser in background thread
    threading.Thread(target=_open_browser, args=(url,), daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n  Server stopped.\n")
        server.shutdown()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OralAI frontend server")
    parser.add_argument("--port", "-p", type=int, default=8080,
                        help="Port to listen on (default: 8080)")
    args = parser.parse_args()
    run(args.port)
