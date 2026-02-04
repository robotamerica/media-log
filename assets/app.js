(() => {
  const content = document.getElementById("content");

  const btnLatest = document.getElementById("modeLatest");
  const btnAll = document.getElementById("modeAll");
  const btnText = document.getElementById("modeText");
  const btnAudio = document.getElementById("modeAudio");
  const btnVisual = document.getElementById("modeVisual");
  const themeToggle = document.getElementById("themeToggle");

  let viewMode = "latest";
  const activeTypes = new Set(["text", "audio", "visual"]);

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
    if (t === "reading") return "text";
    if (t === "music") return "audio";
    if (t === "video") return "visual";
    return "text";
  };

  const setOn = (el, on) => el && el.classList.toggle("is-on", !!on);

  const syncTypeButton = (btn, type) => {
    const on = activeTypes.has(type);
    setOn(btn, on);
    btn?.setAttribute("aria-pressed", on ? "true" : "false");
  };

  const setButtons = () => {
    setOn(btnLatest, viewMode === "latest");
    setOn(btnAll, viewMode === "all");
    syncTypeButton(btnText, "text");
    syncTypeButton(btnAudio, "audio");
    syncTypeButton(btnVisual, "visual");
  };

  const toggleType = (type) => {
    activeTypes.has(type) ? activeTypes.delete(type) : activeTypes.add(type);
    if (activeTypes.size === 0) {
      activeTypes.add("text");
      activeTypes.add("audio");
      activeTypes.add("visual");
    }
  };

  const applyFilter = () => {
    document.querySelectorAll(".item").forEach(el => {
      const t = el.getAttribute("data-type") || "text";
      el.style.display = activeTypes.has(t) ? "" : "none";
    });
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("media-log-theme", theme);
    themeToggle.textContent = theme === "dark" ? "⏾" : "⭘";
  };

  const fetchJSON = async (path) => {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(path);
    return res.json();
  };

  const renderEntry = (it) => {
    const t = normalizeType(it.type);
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
  };

  const renderDay = (date, items) => `
    <article class="day">
      <h2>${esc(date)}</h2>
      ${(items || []).map(renderEntry).join("") || `<div class="note">no entries</div>`}
    </article>
  `;

  const load = async () => {
    content.innerHTML = "";
    try {
      const dates = await fetchJSON("./data/index.json");
      const useDates = viewMode === "latest" ? dates.slice(0,1) : dates;
      const blocks = [];
      for (const d of useDates) {
        try {
          const items = await fetchJSON(`./data/${d}.json`);
          blocks.push(renderDay(d, items));
        } catch {
          blocks.push(renderDay(d, []));
        }
      }
      content.innerHTML = blocks.join("");
      applyFilter();
    } catch {
      content.innerHTML = `<div class="note">could not load data</div>`;
    }
  };

  btnLatest?.addEventListener("click", () => { viewMode="latest"; setButtons(); load(); });
  btnAll?.addEventListener("click", () => { viewMode="all"; setButtons(); load(); });

  btnText?.addEventListener("click", () => { toggleType("text"); setButtons(); applyFilter(); });
  btnAudio?.addEventListener("click", () => { toggleType("audio"); setButtons(); applyFilter(); });
  btnVisual?.addEventListener("click", () => { toggleType("visual"); setButtons(); applyFilter(); });

  themeToggle?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  setButtons();
  applyTheme(localStorage.getItem("media-log-theme") || "light");
  load();
})();
