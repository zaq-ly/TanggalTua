"""Membuat ikon PWA dari SVG di folder ini. Jalankan: python scripts/icons/generate.py

Butuh Google Chrome (untuk merender SVG) dan Pillow. Hasil ditulis ke public/.
Hanya dijalankan saat ikon diubah; hasil PNG ikut di-commit.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent.parent / "public"
CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
]


def render(svg: Path, out: Path) -> None:
    for chrome in CHROME_PATHS:
        try:
            with tempfile.TemporaryDirectory() as profile:
                subprocess.run(
                    [chrome, "--headless=new", "--disable-gpu", f"--user-data-dir={profile}",
                     "--hide-scrollbars", "--window-size=512,512", "--default-background-color=00000000",
                     f"--screenshot={out}", svg.as_uri()],
                    check=True, capture_output=True, timeout=60,
                )
            return
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    sys.exit("Chrome tidak ditemukan. Pasang Google Chrome atau ubah CHROME_PATHS.")


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp) / "icon.png"
        maskable = Path(tmp) / "maskable.png"
        render(HERE / "icon.svg", base)
        render(HERE / "icon-maskable.svg", maskable)
        any_icon = Image.open(base).convert("RGBA")
        mask_icon = Image.open(maskable).convert("RGBA")

        any_icon.save(PUBLIC / "pwa-512x512.png", optimize=True)
        any_icon.resize((192, 192), Image.LANCZOS).save(PUBLIC / "pwa-192x192.png", optimize=True)
        mask_icon.save(PUBLIC / "maskable-512x512.png", optimize=True)
        # iOS membulatkan sudut sendiri dan tidak mendukung transparansi: pakai versi penuh.
        mask_icon.convert("RGB").resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-touch-icon.png", optimize=True)
        any_icon.resize((48, 48), Image.LANCZOS).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    (PUBLIC / "favicon.svg").write_text((HERE / "icon.svg").read_text(encoding="utf-8"), encoding="utf-8")
    print("Ikon dibuat di", PUBLIC)


if __name__ == "__main__":
    main()
