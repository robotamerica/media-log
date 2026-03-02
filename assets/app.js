(() => {
  const content = document.getElementById("content");

  const btnWeek = document.getElementById("modeWeek");
  const btnMonth = document.getElementById("modeMonth");
  const btnPrev = document.getElementById("weekPrev");
  const btnNext = document.getElementById("weekNext");
  const monthSelect = document.getElementById("monthSelect");

  const btnText = document.getElementById("modeText");
  const btnAudio = document.getElementById("modeAudio");
  const btnVisual = document.getElementById("modeVisual");
  const btnPhysical = document.getElementById("modePhysical");
  const themeToggle = document.getElementById("themeToggle");

  let viewMode = "week";
  let weekPage = 0;
  let allDates = null;

  const activeTypes = new Set(["text", "audio", "visual", "physical"]);

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
    if (t === "physical" || t === "p") return "physical";
    if (t === "reading") return "text";
    if (t === "music") return "audio";
    if (t === "video") return "visual";
    return "text";
  };

  const setOn = (el, on) => el && el.classList.toggle("is-on", !!on);
  const show = (el, on) => el && el.classList.toggle("hidden", !on);

  const syncTypeButton = (btn, type) => {
    if (!btn) return;
    const on = activeTypes.has(type);
    setOn(btn, on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  };

  const setButtons = () => {
    setOn(btnWeek, viewMode === "week");
    setOn(btnMonth, viewMode === "month");

    syncTypeButton(btnText, "text");
    syncTypeButton(btnAudio, "audio");
    syncTypeButton(btnVisual, "visual");
    syncTypeButton(btnPhysical, "physical");

    show(btnPrev, viewMode === "week");
    show(btnNext, viewMode === "week");
    show(monthSelect, viewMode === "month");

    if (viewMode === "week" && allDates && Array.isArray(allDates)) {
      if (btnPrev) btnPrev.disabled = weekPage === 0;
      if (btnNext) btnNext.disabled = (weekPage + 1) * 7 >= allDates.length;
    }
  };

  const toggleType = (type) => {
    activeTypes.has(type) ? activeTypes.delete(type) : activeTypes.add(type);
    if (activeTypes.size === 0) {
      activeTypes.add("text");
      activeTypes.add("audio");
      activeTypes.add("visual");
      activeTypes.add("physical");
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
    if (themeToggle) themeToggle.textContent = theme === "dark" ? "⏾" : "⭘";
  };

  const fetchJSON = async (path) => {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(path);
    return res.json();
  };

  const renderEntry = (it) => {
    const t = normalizeType(it.type);
    const url = (it.url || "").trim();
    const rawTitle = (it.title || "").trim();
    const rawAuthor = (it.author || "").trim();

    const titleText = rawTitle ? esc(rawTitle) : (url ? esc(url) : "untitled");
    const authorText = rawAuthor ? esc(rawAuthor) : "";
    const byline = authorText ? ` <span class="by">by</span> <span class="author">${authorText}</span>` : "";

    const note = it.note ? String(it.note) : "";
    const noteHtml = note ? `<div class="enote">— ${esc(note)}</div>` : "";

    const main = url
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${titleText}</a>${byline}`
      : `<span class="plain">${titleText}</span>${byline}`;

    return `
      <div class="item" data-type="${esc(t)}">
        <span class="bullet">•</span>
        <span class="etype">${esc(t)}</span>
        ${main}
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

  const loadDates = async (dates) => {
    content.innerHTML = "";
    if (!dates || dates.length === 0) {
      content.innerHTML = `<div class="note">no entries</div>`;
      return;
    }

    const blocks = await Promise.all(
      dates.map(async (d) => {
        try {
          const items = await fetchJSON(`./data/${d}.json`);
          return renderDay(d, items);
        } catch {
          return renderDay(d, []);
        }
      })
    );

    content.innerHTML = blocks.join("");
    applyFilter();
  };

  const buildMonthOptions = (dates) => {
    const months = new Set();
    for (const d of dates) months.add(d.slice(0, 7));
    const list = Array.from(months).sort().reverse();

    if (!monthSelect) return;

    monthSelect.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "choose month…";
    monthSelect.appendChild(opt0);

    for (const m of list) {
      const o = document.createElement("option");
      o.value = m;
      o.textContent = m;
      monthSelect.appendChild(o);
    }
  };

  const ensureIndex = async () => {
    if (allDates) return allDates;
    const dates = await fetchJSON("./data/index.json");
    allDates = Array.isArray(dates) ? dates : [];
    buildMonthOptions(allDates);
    return allDates;
  };

  const loadWeek = async () => {
    const dates = await ensureIndex();
    const start = weekPage * 7;
    const slice = dates.slice(start, start + 7);
    setButtons();
    await loadDates(slice);
  };

  const loadMonth = async () => {
    const dates = await ensureIndex();
    const m = (monthSelect?.value || "").trim();
    setButtons();
    if (!m) {
      content.innerHTML = `<div class="note">choose a month to load</div>`;
      return;
    }
    const inMonth = dates.filter(d => d.startsWith(m));
    await loadDates(inMonth);
  };

  btnWeek?.addEventListener("click", () => {
    viewMode = "week";
    setButtons();
    loadWeek();
  });

  btnMonth?.addEventListener("click", () => {
    viewMode = "month";
    setButtons();
    loadMonth();
  });

  btnPrev?.addEventListener("click", () => {
    if (weekPage > 0) weekPage -= 1;
    loadWeek();
  });

  btnNext?.addEventListener("click", () => {
    weekPage += 1;
    loadWeek();
  });

  monthSelect?.addEventListener("change", () => {
    if (viewMode === "month") loadMonth();
  });

  btnText?.addEventListener("click", () => { toggleType("text"); setButtons(); applyFilter(); });
  btnAudio?.addEventListener("click", () => { toggleType("audio"); setButtons(); applyFilter(); });
  btnVisual?.addEventListener("click", () => { toggleType("visual"); setButtons(); applyFilter(); });
  btnPhysical?.addEventListener("click", () => { toggleType("physical"); setButtons(); applyFilter(); });

  themeToggle?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  setButtons();
  applyTheme(localStorage.getItem("media-log-theme") || "light");
  loadWeek();
})();