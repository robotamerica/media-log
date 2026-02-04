(async function () {
  const content = document.getElementById("content");
  const status = document.getElementById("status");

  const btnLatest = document.getElementById("modeLatest");
  const btnAll = document.getElementById("modeAll");
  const btnText = document.getElementById("modeText");
  const btnAudio = document.getElementById("modeAudio");
  const btnVisual = document.getElementById("modeVisual");
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

  // theme: default light; allow toggle if present
  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  function renderEntry(it) {
  const type = normalizeType(it.type);
  if (typeFilter !== "all" && type !== typeFilter) return "";

  const title = it.title ? esc(it.title) : esc(it.url);
  const note = it.note ? String(it.note) : "";
  const noteHtml = note ? `<div class="enote">— ${esc(note)}</div>` : "";

  return `
    <div class="item">
      <span class="bullet">•</span>
      <span class="etype">${esc(type)}</span>
      <a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${title}</a>
      ${noteHtml}
    </div>
  `;
})();