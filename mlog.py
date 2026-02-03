#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import subprocess
from pathlib import Path

ALLOWED = {"reading", "music", "video"}
ALIASES = {
    "r": "reading", "read": "reading",
    "m": "music", "song": "music",
    "v": "video", "watch": "video",
}

def norm_type(t: str) -> str:
    t = (t or "").strip().lower()
    t = ALIASES.get(t, t)
    return t if t in ALLOWED else "reading"

def today_iso() -> str:
    return dt.date.today().isoformat()

def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise SystemExit(f"JSON parse error in {path}: {e}")

def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def run(cmd, cwd: Path):
    p = subprocess.run(cmd, cwd=str(cwd), text=True, capture_output=True)
    if p.returncode != 0:
        raise SystemExit(
            f"Command failed: {' '.join(cmd)}\n"
            f"stdout:\n{p.stdout}\n"
            f"stderr:\n{p.stderr}\n"
        )
    return p.stdout.strip()

def main():
    ap = argparse.ArgumentParser(
        prog="mlog",
        description="Append a media entry to data/YYYY-MM-DD.json and update data/index.json, then git push.",
    )
    ap.add_argument("type", help="reading|music|video (or r/m/v)")
    ap.add_argument("url", help="https://…")
    ap.add_argument("-t", "--title", default="", help="Optional title")
    ap.add_argument("-n", "--note", default="", help="Optional note")
    ap.add_argument("-d", "--date", default=today_iso(), help="YYYY-MM-DD (default: today)")
    ap.add_argument("--repo", default=".", help="Path to repo root (default: .)")
    ap.add_argument("--no-git", action="store_true", help="Do not git add/commit/push")
    ap.add_argument("--msg", default="", help="Custom commit message")
    args = ap.parse_args()

    repo = Path(args.repo).expanduser().resolve()
    data_dir = repo / "data"
    day = args.date.strip()

    try:
        dt.date.fromisoformat(day)
    except ValueError:
        raise SystemExit(f"Invalid date: {day} (expected YYYY-MM-DD)")

    entry_type = norm_type(args.type)
    url = args.url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise SystemExit("URL must start with http:// or https://")

    day_path = data_dir / f"{day}.json"
    items = load_json(day_path, default=[])
    if not isinstance(items, list):
        raise SystemExit(f"{day_path} must be a JSON array")

    entry = {
        "type": entry_type,
        "url": url,
        "title": (args.title or "").strip(),
        "note": (args.note or "").strip(),
    }

    items.append(entry)
    save_json(day_path, items)

    index_path = data_dir / "index.json"
    index = load_json(index_path, default=[])
    if not isinstance(index, list):
        raise SystemExit(f"{index_path} must be a JSON array")

    if day not in index:
        index.append(day)

    index_sorted = sorted(set(index), reverse=True)
    save_json(index_path, index_sorted)

    print(f"✅ Added to {day_path.relative_to(repo)}")
    print(f"✅ Updated {index_path.relative_to(repo)}")
    print(f"→ {entry_type} | {url}")

    if args.no_git:
        return

    run(["git", "rev-parse", "--is-inside-work-tree"], cwd=repo)
    run(["git", "add", str(day_path), str(index_path)], cwd=repo)

    msg = args.msg.strip()
    if not msg:
        short = entry["title"] if entry["title"] else entry["url"]
        msg = f"media {day}: {entry_type} - {short}"

    staged = run(["git", "diff", "--cached", "--name-only"], cwd=repo)
    if staged:
        run(["git", "commit", "-m", msg], cwd=repo)

    run(["git", "push"], cwd=repo)
    print("🚀 Pushed. GitHub Pages will refresh on deploy.")

if __name__ == "__main__":
    main()
