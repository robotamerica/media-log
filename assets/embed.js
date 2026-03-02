(() => {
  const content = document.getElementById("content");

  const esc = (s="") =>
    String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");

  const normalizeType = (t) => {
    t = (t || "").toLowerCase().trim();
    if (t === "text" || t === "t" || t === "reading") return "text";
    if (t === "audio" || t === "a" || t === "music") return "audio";
    if (t === "visual" || t === "v" || t === "video") return "visual";
    if (t === "physical" || t === "p") return "physical";
    return "text";
  };

  async function fetchJSON(path){
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }

  function renderEntry(it){
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
  }

  function renderDay(date, items){
    const rows = (items || []).map(renderEntry).join("");
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
    try{
      const dates = await fetchJSON("./data/index.json");
      const d = Array.isArray(dates) && dates.length ? dates[0] : null;
      if (!d){
        content.innerHTML = `<article class="day"><div class="note">no entries yet</div></article>`;
        return;
      }
      const items = await fetchJSON(`./data/${d}.json`);
      content.innerHTML = renderDay(d, items);
    }catch(e){
      content.innerHTML = `<article class="day"><div class="note"><code>${esc(e.message)}</code></div></article>`;
    }
  }

  load();
})();