#!/usr/bin/env python3
import datetime as dt
import html as htmlmod
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.request import Request, urlopen

ALLOWED = {"text", "audio", "visual", "physical"}
ALIASES = {"t": "text", "a": "audio", "v": "visual", "p": "physical"}

UA = "Mozilla/5.0 (compatible; mlog/1.1; +https://github.com/robotamerica/media-log)"

def prompt(label, allow_empty=False):
    while True:
        val = input(f"{label}: ").strip()
        if val or allow_empty:
            return val

def norm_type(t: str):
    t = (t or "").strip().lower()
    t = ALIASES.get(t, t)
    return t if t in ALLOWED else None

def today_iso():
    return dt.date.today().isoformat()

def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))

def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def run(cmd, cwd: Path):
    return subprocess.run(cmd, cwd=str(cwd)).returncode

def fetch_html(url: str, max_bytes: int = 450_000) -> str:
    req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urlopen(req, timeout=15) as r:
        data = r.read(max_bytes)
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", "ignore")

def _clean_text(s: str) -> str:
    s = htmlmod.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def extract_meta(html: str, names):
    for n in names:
        m = re.search(
            rf'<meta[^>]+(?:name|property)\s*=\s*["\']{re.escape(n)}["\'][^>]+content\s*=\s*["\']([^"\']+)["\']',
            html,
            re.I,
        )
        if m:
            return _clean_text(m.group(1))
    return ""

def extract_title(html: str, fallback: str) -> str:
    t = extract_meta(html, ["og:title", "twitter:title"])
    if t:
        return t
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    if m:
        return _clean_text(m.group(1))
    return fallback

def extract_author_from_jsonld(obj):
    def pick_name(x):
        if isinstance(x, dict):
            return x.get("name") or x.get("alternateName") or ""
        if isinstance(x, str):
            return x
        return ""

    if isinstance(obj, dict):
        if "author" in obj:
            a = obj["author"]
            if isinstance(a, list):
                for item in a:
                    name = pick_name(item)
                    if name:
                        return name
            else:
                name = pick_name(a)
                if name:
                    return name
        for v in obj.values():
            name = extract_author_from_jsonld(v)
            if name:
                return name
    elif isinstance(obj, list):
        for item in obj:
            name = extract_author_from_jsonld(item)
            if name:
                return name
    return ""

def extract_author(html: str) -> str:
    a = extract_meta(html, ["author", "article:author", "og:article:author", "twitter:creator"])
    if a:
        return a

    for m in re.finditer(r'<script[^>]+type\s*=\s*["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.I | re.S):
        raw = m.group(1).strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue
        name = extract_author_from_jsonld(data)
        if name:
            return _clean_text(name)

    return ""

def guess_title_author(url: str):
    try:
        page = fetch_html(url)
    except Exception:
        return "", ""
    return extract_title(page, url), extract_author(page)

def main():
    repo = Path(".").resolve()
    data_dir = repo / "data"
    day = today_iso()

    print("type (text | audio | visual | physical)")
    while True:
        raw = input("> ").strip()
        t = norm_type(raw)
        if t:
            break
        print("invalid type. use: text | audio | visual | physical")

    url = prompt("url (blank allowed)", allow_empty=True)
    if url and not url.startswith(("http://", "https://")):
        print("url must start with http:// or https:// (or be blank)")
        sys.exit(1)

    title = prompt("title (blank = auto if url)", allow_empty=True)
    author = prompt("author (blank = auto if url)", allow_empty=True)
    note = prompt("note", allow_empty=True)

    if url and (not title or not author):
        auto_title, auto_author = guess_title_author(url)
        if not title and auto_title:
            title = auto_title
        if not author and auto_author:
            author = auto_author

    day_path = data_dir / f"{day}.json"
    items = load_json(day_path, default=[])
    if not isinstance(items, list):
        print(f"{day_path} must be a JSON array")
        sys.exit(1)

    entry = {"type": t, "title": title, "note": note}
    if url:
        entry["url"] = url
    if author:
        entry["author"] = author

    items.append(entry)
    save_json(day_path, items)

    index_path = data_dir / "index.json"
    index = load_json(index_path, default=[])
    if not isinstance(index, list):
        print(f"{index_path} must be a JSON array")
        sys.exit(1)

    if day not in index:
        index.append(day)
    save_json(index_path, sorted(set(index), reverse=True))

    print(f"[mlog] added {t}")
    if url:
        print(f"[mlog] url: {url}")
    if title:
        print(f"[mlog] title: {title}")
    if author:
        print(f"[mlog] author: {author}")

    if run(["git", "rev-parse", "--is-inside-work-tree"], repo) != 0:
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