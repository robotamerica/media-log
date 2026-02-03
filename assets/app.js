(() => {
  const TYPES = ["text", "audio", "visual"];

  const $ = (id) => document.getElementById(id);

  function esc(s="") {
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function setActive(btnId) {
    ["modeAll", "modeText", "modeAudio", "modeVisual"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.setAttribute("aria-pressed", id === btnId ? "true" : "false");
      el.classList.toggle("active", id === btnId);
    });
  }

  function applyFilter(typeOrAll) {
    document.querySelectorAll("[data-entry-type]").forEach((el) => {
      const t = el.getAttribute("data-entry-type");
      el.style.display = (typeOrAll === "all" || t === typeOrAll) ? "" : "none";
    });
  }

  function wireButtons() {
    const btnAll = $("modeAll");
    const btnText = $("modeText");
    const btnAudio = $("modeAudio");
    const btnVisual = $("modeVisual");

    btnAll?.addEventListener("click", () => { setActive("modeAll"); applyFilter("all"); });
    btnText?.addEventListener("click", () => { setActive("modeText"); applyFilter("text"); });
    btnAudio?.addEventListener("click", () => { setActive("modeAudio"); applyFilter("audio"); });
    btnVisual?.addEventListener("click", () => { setActive("modeVisual"); applyFilter("visual"); });

    // default
    setActive("modeAll");
    applyFilter("all");
  }

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }

  function renderEntry(entry) {
    const type = (entry.type || "").toLowerCase();
    const url = entry.url || "";
    const title = entry.title || url;
    const note = entry.note || "";

    const pill = type ? `<span class="pill">${esc(type)}</span>` : "";
    const noteHtml = note ? `<div class="note">${esc(note)}</div>` : "";

    return `
      <li class="entry" data-entry-type="${esc(type)}">
        <div class="row">
          ${pill}
          <a class="link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>
        </div>
        ${noteHtml}
      </li>
    `;
  }

  function renderDay(dateStr, entries) {
    const items = (entries || [])
      .filter(e => e && typeof e === "object" && e.url)
      .map(renderEntry)
      .join("");

    return `
      <section class="day">
        <h2 class="dayTitle">${esc(dateStr)}</h2>
        <ul class="entries">
          ${items || `<li class="entry empty">no entries</li>`}
        </ul>
      </section>
    `;
  }

  async function load() {
    const out = $("log");
    const status = $("status");
    if (!out) return;

    try {
      status && (status.textContent = "loading…");
      const dates = await fetchJSON("./data/index.json");

      if (!Array.isArray(dates) || dates.length === 0) {
        out.innerHTML = `<p class="muted">no days yet. add your first entry with <code>./mlog.py</code>.</p>`;
        status && (status.textContent = "ready");
        return;
      }

      const pages = await Promise.all(
        dates.map(async (d) => {
          try {
            const entries = await fetchJSON(`./data/${d}.json`);
            return renderDay(d, entries);
          } catch (e) {
            return renderDay(d, []);
          }
        })
      );

      out.innerHTML = pages.join("\n");
      status && (status.textContent = "ready");
    } catch (e) {
      out.innerHTML = `
        <p class="error">
          could not load your log. check that <code>data/index.json</code> exists and is valid JSON.
          <br/>detail: <code>${esc(e.message)}</code>
        </p>
      `;
      status && (status.textContent = "error");
    } finally {
      // always re-apply current filter after render
      applyFilter("all");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireButtons();
    load();
  });
})();
