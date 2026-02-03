#!/usr/bin/env python3
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path

ALLOWED = {"text", "audio", "visual"}
ALIASES = {
    "t": "text",
    "a": "audio",
    "v": "visual",
}

def prompt(label, allow_empty=False):
    while True:
        val = input(f"{label}: ").strip()
        if val or allow_empty:
            return val

def norm_type(t):
    t = (t or "").strip().lower()
    t = ALIASES.get(t, t)
    return t if t in ALLOWED else None

def today_iso():
    return dt.date.today().isoformat()

def load_json(path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

def run(cmd, cwd):
    return subprocess.run(cmd, cwd=str(cwd)).returncode

def main():
    repo = Path(".").resolve()
    data_dir = repo / "data"
    day = today_iso()

    print("type (text | audio | visual)")
    while True:
        raw = input("> ").strip()
        t = norm_type(raw)
        if t:
            break
        print("invalid type. use: text | audio | visual")

    url = prompt("url")
    if not url.startswith(("http://", "https://")):
        print("url must start with http:// or https://")
        sys.exit(1)

    title = prompt("title", allow_empty=True)
    note = prompt("note", allow_empty=True)

    day_path = data_dir / f"{day}.json"
    items = load_json(day_path, default=[])

    entry = {
        "type": t,
        "url": url,
        "title": title,
        "note": note,
    }

    items.append(entry)
    save_json(day_path, items)

    index_path = data_dir / "index.json"
    index = load_json(index_path, default=[])
    if day not in index:
        index.append(day)
    save_json(index_path, sorted(set(index), reverse=True))

    print(f"[mlog] added {t}: {url}")

    # git section
    if run(["git", "rev-parse", "--is-inside-work-tree"], repo) != 0:
        print("[mlog] not a git repo, skipping git")
        return

    run(["git", "add", str(day_path), str(index_path)], repo)
    run(["git", "commit", "-m", f"media {day}: {t}"], repo)
    run(["git", "push"], repo)

    print("[mlog] committed and pushed")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[mlog] cancelled")
        sys.exit(130)
