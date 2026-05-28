from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RELEASE_DIR = ROOT / "release"
DIST_DIR = ROOT / "dist"
PLUGIN_NAME = "decky-offline-soluce"
VERSION = "0.40.0"
ZIP_NAME = f"{PLUGIN_NAME}-v{VERSION}.zip"

REQUIRED = [
    ROOT / "dist" / "index.js",
    ROOT / "package.json",
    ROOT / "plugin.json",
    ROOT / "main.py",
    ROOT / "README.md",
    ROOT / "LICENSE",
]

OPTIONAL = [
    ROOT / "INSTALLATION_UTILISATION.md",
]


def main() -> int:
    missing = [path for path in REQUIRED if not path.exists()]
    if missing:
        print("Fichiers manquants :")
        for path in missing:
            print(f" - {path.relative_to(ROOT)}")
        print("Commence par lancer le build frontend (`pnpm run build`).")
        return 1

    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    target = RELEASE_DIR / ZIP_NAME
    if target.exists():
        target.unlink()

    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in REQUIRED + [p for p in OPTIONAL if p.exists()]:
            arcname = f"{PLUGIN_NAME}/{path.relative_to(ROOT).as_posix()}"
            zf.write(path, arcname)

    print(f"ZIP créé : {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
