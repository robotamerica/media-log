(async function () {
  const content = document.getElementById("content");
  const btnLatest = document.getElementById("modeLatest");
  const btnAll = document.getElementById("modeAll");
  const themeToggle = document.getElementById("themeToggle");

  function applyTheme(t){
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("media-log-theme", t);
  }

  const savedTheme = localStorage.getItem("media-log-theme");
  if (savedTheme) applyTheme(savedTheme);

  let mode = "latest";

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeType(t) {
    t = (t || "").toLowerCase().trim();
    if (t === "read" || t === "reading" || t === "r") return "reading";
    if (t === "song" || t === "music" || t === "m") return "music";
    if (t === "watch" || t === "video" || t === "v") return "video";
    return "reading";
  }

  function groupItems(items) {
    const groups = { reading: [], music: [], video: [] };
    for (const it of items) groups[normalizeType(it.type)].push(it);
    return groups;
  }

  function renderDay(date, items) {
    const groups = groupItems(items || []);
    const block = (label, list) => {
      if (!list.length) return "";
      const rows = list.map((it) => {
        const title = it.title ? esc(it.title) : esc(it.url);
        const note = it.note ? ` <span class="note">— ${esc(it.note)}</span>` : "";
        return `
          <div class="item">
            <span class="bullet">•</span>
            <a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${title}</a>
            ${note}
          </div>
        `;
      }).join("");
      return `<div class="group"><h3>${label}</h3>${rows}</div>`;
    };

    return `
      <article class="day">
        <h2>${esc(date)}</h2>
        ${block("reading", groups.reading)}
        ${block("music", groups.music)}
        ${block("video", groups.video)}
      </article>
    `;
  }

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error();
    return res.json();
  }

  function setButtons() {
    btnLatest?.classList.toggle("is-on", mode === "latest");
    btnAll?.classList.toggle("is-on", mode === "all");
  }

  async function load() {
    content.innerHTML = `<div class="day">loading…</div>`;
    let dates;
    try {
      dates = await fetchJSON("./data/index.json");
    } catch {
      content.innerHTML = `<div class="day">no entries yet</div>`;
      return;
    }

    const slice = mode === "latest" ? dates.slice(0, 1) : dates;
    const blocks = [];

    for (const d of slice) {
      try {
        const items = await fetchJSON(`./data/${d}.json`);
        blocks.push(renderDay(d, items));
      } catch {
        blocks.push(renderDay(d, []));
      }
    }

    content.innerHTML = blocks.join("");
  }

  btnLatest?.addEventListener("click", () => { mode = "latest"; setButtons(); load(); });
  btnAll?.addEventListener("click", () => { mode = "all"; setButtons(); load(); });

  themeToggle?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  setButtons();
  load();
})();
