#!/usr/bin/env python3
"""Assemble Iron Under Heaven from src/.

  dist/iron-under-heaven.html   single file, no <html>/<head>/<body> (for the Claude artifact)
  web/index.html                full page for GitHub Pages, Electron and Android, plus
  web/manifest.webmanifest, web/sw.js, web/icons/*   (installable, works offline)
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
LANGS = ["en", "zh-Hans", "zh-Hant", "ja", "es", "fr"]
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Cormorant+Garamond:wght@600;700'
         '&family=Spectral:ital,wght@0,400;0,600;1,400&family=Alegreya+Sans:wght@500;700;800&display=swap">')


def read(p):
    return (SRC / p).read_text(encoding="utf-8")


def script():
    game = read("game.js")
    assert "/*CANVAS*/" in game
    game = game.replace("/*CANVAS*/", read("canvas.js"))
    parts = [read("lang/_base.js")] + [read(f"lang/{l}.js") for l in LANGS] + [game]
    return "\n".join(parts)


def artifact():
    return "\n".join([
        "<title>Iron Under Heaven</title>",
        '<meta name="claude:viewport-fit-sides" content="cover">',
        FONTS,
        "<style>", read("style.css"), "</style>",
        read("body.html"),
        "<script>", script(), "</script>",
    ])


SW_REGISTER = """<script>
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !window.Capacitor) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
</script>"""

APP_CSS = """
html, body { overscroll-behavior: none; }
body { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
"""


def web():
    return "\n".join([
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        "<title>Iron Under Heaven</title>",
        '<meta name="description" content="A forging story of the Warring States. Mend weapons for the war, earn your leave, and protect your family.">',
        '<meta name="theme-color" content="#120e0c">',
        '<meta name="apple-mobile-web-app-capable" content="yes">',
        '<meta name="mobile-web-app-capable" content="yes">',
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
        '<link rel="manifest" href="manifest.webmanifest">',
        '<link rel="icon" href="icons/icon.svg" type="image/svg+xml">',
        '<link rel="apple-touch-icon" href="icons/icon-192.png">',
        FONTS,
        "<style>", read("style.css"), APP_CSS, "</style>",
        "</head>",
        "<body>",
        read("body.html"),
        "<script>", script(), "</script>",
        SW_REGISTER,
        "</body>",
        "</html>",
    ])


MANIFEST = {
    "name": "Iron Under Heaven",
    "short_name": "Iron Under Heaven",
    "description": "A forging story of the Warring States.",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "any",
    "background_color": "#120e0c",
    "theme_color": "#120e0c",
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        {"src": "icons/icon.svg", "sizes": "any", "type": "image/svg+xml"},
    ],
}

# Cache-first for the game itself, stale-while-revalidate for Google Fonts so text keeps its look offline.
SW = """const CACHE = "iuh-%s";
const CORE = ["./", "index.html", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match("index.html"))));
  } else if (/fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => { const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit); return hit || net; })));
  }
});
"""


def main():
    (ROOT / "dist").mkdir(exist_ok=True)
    (ROOT / "dist/iron-under-heaven.html").write_text(artifact(), encoding="utf-8")
    w = ROOT / "web"
    (w / "icons").mkdir(parents=True, exist_ok=True)
    (w / "index.html").write_text(web(), encoding="utf-8")
    (w / "manifest.webmanifest").write_text(json.dumps(MANIFEST, indent=2, ensure_ascii=False), encoding="utf-8")
    (w / "sw.js").write_text(SW % VERSION, encoding="utf-8")
    (w / "icons/icon.svg").write_text((ROOT / "assets/icon.svg").read_text(encoding="utf-8"), encoding="utf-8")
    for p in ["dist/iron-under-heaven.html", "web/index.html"]:
        print(f"{p}: {len((ROOT / p).read_bytes()) // 1024} KB")


if __name__ == "__main__":
    main()
