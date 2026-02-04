(() => {
  const content = document.getElementById("content");

  const btnLatest = document.getElementById("modeLatest");
  const btnAll    = document.getElementById("modeAll");
  const btnText   = document.getElementById("modeText");
  const btnAudio  = document.getElementById("modeAudio");
  const btnVisual = document.getElementById("modeVisual");
  const themeToggle = document.getElementById("themeToggle");

  let viewMode = "latest"; // latest | all
  let typeFilter = "all";  // all | text | audio | visual

  const esc = (s="") =>
    String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");

  const normalizeType = (t) => {
    t = (t || "").toLowerCase().trim();
    if (t === "text" || t === "t") return "text";
    if (t === "audio" || t === "a") return "audio";
    if (t === "visual" || t === "v") return "visual";
    // legacy support
    if (t === "reading") return "text";
    if (t === "music") return "audio";
    if (t === "video") return "visual";
    return "text";
  };

  function setOn(el, on){ if (el) el.classList.toggle("is-on", cat > index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>media log</title>
  <link rel="stylesheet" href="./assets/style.css" />
</head>
<body>
  <main class="wrap">
    <header class="top">
      <div class="brand">
        <h1>media log</h1>
        <p class="desc">a small daily ledger of the media i consumed.</p>
      </div>

      <div class="controls">
        <button id="modeLatest" class="btn is-on" type="button">latest</button>
        <button id="modeAll" class="btn" type="button">all</button>
        <button id="modeText" class="btn" type="button">text</button>
        <button id="modeAudio" class="btn" type="button">audio</button>
        <button id="modeVisual" class="btn" type="button">visual</button>
        <button id="themeToggle" class="btn" type="button" aria-label="toggle theme">⭘</button>
      </div>
    </header>

    <section id="content" class="content" aria-live="polite"></section>
  </main>

  <script src="./assets/app.js"></script>
</body>
</html>
HTMLon); }

  function setButtons(){
    setOn(btnLatest, viewMode === "latest");
    setOn(btnAll, viewMode === "all");
    setOn(btnText, typeFilter === "text");
    setOn(btnAudio, typeFilter === "audio");
    setOn(btnVisual, typeFilter === "visual");
  }

  function applyFilter(){
    document.querySelectorAll(".item").forEach((el) => {
      const t = el.getAttribute("data-type") || "text";
      el.style.display = (typeFilter === "all" || t === typeFilter) ? "" : "none";
    });
  }

  function applyTheme(theme){
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("media-log-theme", theme);
    if (themeToggle) themeToggle.textContent = (theme === "dark") ? "⏾" : "⭘";
  }

  async function fetchJSON(path){
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }

  function renderEntry(it){
    const t = normalizeType(it.type);
    if (typeFilter !== "all" && t !== typeFilter) return "";

    const url = it.url || "";
    const title = it.title ? esc(it.title) : esc(url);
    const note = it.note ? String(it.note) : "";
    const noteHtml = note ? `<div class="enote">— ${esc(note)}</div>` : "";

    return `
      <div class="item" data-type="${esc(t)}">
        <span class="bullet">•</span>
        <span class="etype">${esc(t)}</span>
        <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${title}</a>
        ${noteHtml}
      </div>
    `;
  }

  function renderDay(date, items){
    const rows = (items || []).map(renderEntry).filter(Boolean).join("");
    return `
      <article class="day">
        <h2>${esc(date)}</h2>
        ${rows || `<div class="note">no entries</div>`}
      </article>
    `;
  }

  async function load(){
    if (!content) return;
    content.innerHTML = "";

    try {
      const dates = await fetchJSON("./data/index.json");
      if (!Array.isArray(dates) || dates.length === 0){
        content.innerHTML = `<article class="day"><div class="note">no entries yet</div></article>`;
        return;
      }

      const useDates = (viewMode === "latest") ? dates.slice(0, 1) : dates;

      const blocks = [];
      for (const d of useDates){
        try {
          const items = await fetchJSON(`./data/${d}.json`);
          blocks.push(renderDay(d, items));
        } catch {
          blocks.push(renderDay(d, []));
        }
      }

      content.innerHTML = blocks.join("");
      applyFilter();
    } catch (e) {
      content.innerHTML = `
        <article class="day">
          <div class="note">could not load data</div>
          <div class="note"><code>${esc(e.message)}</code></div>
        </article>
      `;
    }
  }

  // events
  btnLatest?.addEventListener("click", () => { viewMode = "latest"; setButtons(); load(); });
  btnAll?.addEventListener("click",    () => { viewMode = "all";    setButtons(); load(); });
  btnText?.addEventListener("click",   () => { typeFilter = "text";  setButtons(); load(); });
  btnAudio?.addEventListener("click",  () => { typeFilter = "audio"; setButtons(); load(); });
  btnVisual?.addEventListener("click", () => { typeFilter = "visual";setButtons(); load(); });

  themeToggle?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  // init
  setButtons();
  applyTheme(localStorage.getItem("media-log-theme") || "light");
  load();
})();
