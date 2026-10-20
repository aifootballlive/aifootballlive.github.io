"""Build all site icons from the single, locally supplied profile image.

This does not fetch TikTok data or imply a linked TikTok account.
Requires Pillow. Run from any directory after replacing assets/branding/profile.png.
"""
import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "assets" / "branding"
PAGES = (
    "index.html", "live.html", "league.html", "tiktok-studio.html",
    "admin-edm2026.html", "admin-settings.html", "admin-security.html",
    "admin-devices.html", "admin/index.html", "live/index.html",
)


def build():
    source = BRAND / "profile.png"
    with Image.open(source) as original:
        original = ImageOps.exif_transpose(original).convert("RGB")
        if original.width != original.height:
            raise ValueError("Profile image must be square; crop it before building icons.")
        image = original.resize((1024, 1024), Image.Resampling.LANCZOS)
    image.save(source, optimize=True)
    revision = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
    for size in (16, 32, 48, 180, 192, 512):
        name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
        image.resize((size, size), Image.Resampling.LANCZOS).save(BRAND / name, optimize=True)
    # Leave the emblem inside the mandatory central safe circle for adaptive masks.
    maskable = Image.new("RGB", (512, 512), image.getpixel((0, 0)))
    maskable.paste(image.resize((358, 358), Image.Resampling.LANCZOS), (77, 77))
    maskable.save(BRAND / "icon-maskable-512.png", optimize=True)
    image.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    (ROOT / "apple-touch-icon.png").write_bytes((BRAND / "apple-touch-icon.png").read_bytes())
    manifest = {
        "id": "/live.html", "name": "AI Football Live", "short_name": "AI Football",
        "lang": "tr", "start_url": "/live.html", "scope": "/", "display": "standalone",
        "background_color": "#060c14", "theme_color": "#061b3a",
        "icons": [
            {"src": f"/assets/branding/icon-{size}.png?v={revision}", "sizes": f"{size}x{size}", "type": "image/png", "purpose": "any"}
            for size in (192, 512)
        ] + [{"src": f"/assets/branding/icon-maskable-512.png?v={revision}", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    }
    (ROOT / "site.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    head = f'''<!-- AFL shared brand icons: generated from assets/branding/profile.png -->
<link rel="icon" type="image/x-icon" href="/favicon.ico?v={revision}">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/branding/icon-32.png?v={revision}">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/branding/icon-16.png?v={revision}">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/branding/apple-touch-icon.png?v={revision}">
<link rel="manifest" href="/site.webmanifest?v={revision}">
<meta name="theme-color" content="#061b3a">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="AI Football">
<!-- /AFL shared brand icons -->'''
    for name in PAGES:
        page = ROOT / name
        content = page.read_text(encoding="utf-8")
        if "<!-- AFL shared brand icons:" in content:
            content = re.sub(r"<!-- AFL shared brand icons:.*?<!-- /AFL shared brand icons -->", lambda _: head, content, flags=re.S)
        else:
            content = content.replace("</title>", "</title>\n" + head, 1)
        page.write_text(content, encoding="utf-8", newline="\n")
    print(f"Built profile, favicon, Apple and Android icons for {len(PAGES)} pages ({revision}).")


if __name__ == "__main__":
    build()
