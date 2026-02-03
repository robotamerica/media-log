(async function () {
  const content = document.getElementById("content");
  const status = document.getElementById("status");

  const btnLatest = document.getElementById("modeLatest");
  const btnAll = document.getElementById("modeAll");
  const btnText = document.getElementById("modeText");
  const btnAudio = document.getElementById("modeAudio");
  const btnVisual = document.getElementById("modeVisual");
  const themeToggle = document.getElementById("themeToggle");

  let viewMode = "latest";     // "latest" | "all"
  let typeFilter = "all";      // "all" | "text" | "audio" | "visual"

  function setStatus(s) {
    if (status) status.textContent = s || "";
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeType(t) {
    t = (t || "").toLowerCase().trim();
    if (t === "t" || t === "text") return "text";
    if (t === "a" || t === "audio") return "audio";
    if (t === "v" || t === "visual") return "visual";
    return "text";
  }

  function setButtonStates() {
    const on = (el, yes) => el && el.classList.toggle("is-on", !!yes);

    on(btnLatest, viewMode === "latest");
    on(btnAll, viewMode === "all");

    on(btnText, typeFilter === "text");
    on(btnAudio, typeFilter === "audio");
    on(btnVisual, typeFilter === "visual");
  }

  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("media-log-theme", t);
  }

  // theme: default light; allow toggle if present
  const savedTheme = localStorage.getItem("media-log-theme");
  if (savedTheme) applyTheme(savedTheme);

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  function renderEntry(it) {
    const type = normalizeType(it.type);
    if (typeFilter !== "all" && type !== typeFilter) return "";

    const title = it.title ? esc(it.title) : esc(it.url);
    const note = it.note ? ` <span class="note">— ${esc(it.note)}</span>` : "";

    return `
      <div class="item">
        <span class="bullet">•</span>
        <span class="note">${esc(type)}</span>
        <a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${title}</a>
        ${note}
      </div>
    `;
  }

  function renderDay(date, items) {
    const rows = (items || []).map(renderEntry).filter(Boolean).join("");
    return `
      <article class="day">
        <h2>${esc(date)}</h2>
        ${rows || `<div class="note">no entries</div>`}
      </article>
    `;
  }

  async function load() {
    setStatus("loading…");
    content.innerHTML = "";

    let dates;
    try {
      dates = await fetchJSON("./data/index.json");
    } catch (e) {
      content.innerHTML = `<article class="day">could not load data/index.json</article>`;
      setStatus("error");
      return;
    }

    if (!Array.isArray(dates) || dates.length === 0) {
      content.innerHTML = `<article class="day">no entries yet</article>`;
      setStatus("ready");
      return;
    }

    const slice = viewMode === "latest" ? dates.slice(0, 1) : dates;

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
    setStatus("ready");
  }

  // button wiring
  btnLatest?.addEventListener("click", () => { viewMode = "latest"; setButtonStates(); load(); });
  btnAll?.addEventListener("click", () => { viewMode = "all"; setButtonStates(); load(); });

  btnText?.addEventListener("click", () => { typeFilter = "text"; setButtonStates(); load(); });
  btnAudio?.addEventListener("click", () => { typeFilter = "audio"; setButtonStates(); load(); });
  btnVisual?.addEventListener("click", () => { typeFilter = "visual"; setButtonStates(); load(); });

  themeToggle?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  setButtonStates();
  load();
})();
