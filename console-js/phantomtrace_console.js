/*
 * PhantomTrace Console Edition
 * Güvenli yerel snapshot karşılaştırıcı.
 * Instagram session/cookie/API/GraphQL verisi okumaz ve otomatik tarama yapmaz.
 * Kullanıcı tarafından seçilen JSON/CSV snapshot verisini tarayıcı localStorage'ında saklar.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "phantomtrace.snapshots.v1";
  const PANEL_ID = "phantomtrace-console-panel";

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const normalize = (value) => String(value ?? "").trim().replace(/^@/, "").toLowerCase();

  function readSnapshots() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error("PhantomTrace kayıtları okunamadı:", error);
      return [];
    }
  }

  function saveSnapshots(snapshots) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    } catch (error) {
      throw new Error("Tarayıcı depolama alanına yazılamadı.");
    }
  }

  function member(value) {
    if (typeof value === "string") {
      const username = normalize(value);
      return username ? { username, id: null } : null;
    }
    if (!value || typeof value !== "object") return null;
    const username = normalize(value.username || value.user || value.name);
    if (!username) return null;
    return { username, id: value.id || value.pk || value.user_id || null };
  }

  function members(values) {
    if (!Array.isArray(values)) return [];
    const unique = new Map();
    values.map(member).filter(Boolean).forEach((item) => unique.set(item.username, item));
    return [...unique.values()];
  }

  function parseJson(text) {
    const parsed = JSON.parse(text);
    const source = parsed.profile && typeof parsed.profile === "object" ? parsed.profile : parsed;
    const result = {
      username: normalize(source.username || source.user),
      profile_id: source.profile_id || source.id || null,
      followers: members(source.followers),
      following: members(source.following),
    };
    validate(result);
    return result;
  }

  function csvLine(line) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { current += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { cells.push(current.trim()); current = ""; }
      else current += char;
    }
    cells.push(current.trim());
    return cells;
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error("CSV en az bir veri satırı içermelidir.");
    const headers = csvLine(lines.shift()).map(normalize);
    const at = (name) => headers.indexOf(name);
    ["username", "relation", "member_username"].forEach((name) => {
      if (at(name) < 0) throw new Error(`CSV sütunu eksik: ${name}`);
    });
    const result = { username: "", profile_id: null, followers: [], following: [] };
    lines.forEach((line) => {
      const row = csvLine(line);
      const username = normalize(row[at("username")]);
      const relation = normalize(row[at("relation")]);
      const item = { username: normalize(row[at("member_username")]), id: at("member_id") >= 0 ? row[at("member_id")] : null };
      if (!result.username) result.username = username;
      if (at("profile_id") >= 0 && !result.profile_id) result.profile_id = row[at("profile_id")] || null;
      if (["followers", "following"].includes(relation) && item.username) result[relation].push(item);
    });
    result.followers = members(result.followers);
    result.following = members(result.following);
    validate(result);
    return result;
  }

  function validate(snapshot) {
    if (!snapshot.username) throw new Error("Snapshot içinde username bulunamadı.");
    if (!Array.isArray(snapshot.followers) || !Array.isArray(snapshot.following)) {
      throw new Error("followers ve following listeleri bulunmalıdır.");
    }
  }

  function usernames(snapshot, relation) {
    return new Set((snapshot[relation] || []).map((item) => item.username));
  }

  function delta(current, previous) {
    const result = {};
    ["following", "followers"].forEach((relation) => {
      const now = usernames(current, relation);
      const old = previous ? usernames(previous, relation) : new Set();
      result[relation] = {
        added: [...now].filter((name) => !old.has(name)).sort(),
        removed: [...old].filter((name) => !now.has(name)).sort(),
        currentCount: now.size,
        previousCount: old.size,
      };
    });
    return result;
  }

  function list(items, className) {
    if (!items.length) return '<li class="pt-muted">Değişiklik yok</li>';
    return items.map((item) => `<li class="${className}">@${escapeHtml(item)}</li>`).join("");
  }

  function renderResult(username, current, previous) {
    const result = delta(current, previous);
    const relationBlock = (relation, title) => `
      <section class="pt-card">
        <h3>${title}</h3>
        <p class="pt-muted">Mevcut: ${result[relation].currentCount} · Önceki: ${result[relation].previousCount}</p>
        <div class="pt-columns">
          <div><strong class="pt-green">Yeni eklenenler (${result[relation].added.length})</strong><ul>${list(result[relation].added, "pt-green")}</ul></div>
          <div><strong class="pt-red">Çıkarılanlar (${result[relation].removed.length})</strong><ul>${list(result[relation].removed, "pt-red")}</ul></div>
        </div>
      </section>`;
    return `<div class="pt-success">@${escapeHtml(username)} snapshot kaydedildi.</div>
      ${previous ? relationBlock("following", "Takip edilenler") + relationBlock("followers", "Takipçiler") : '<div class="pt-card"><p>İlk snapshot kaydedildi. Delta görmek için aynı profilin ikinci snapshot’ını içe aktarın.</p></div>'}`;
  }

  function parseFile(file) {
    return file.text().then((text) => file.name.toLowerCase().endsWith(".csv") ? parseCsv(text) : parseJson(text));
  }

  function importSnapshot(file, output) {
    parseFile(file).then((current) => {
      const snapshots = readSnapshots();
      const previous = snapshots.filter((item) => item.username === current.username).sort((a, b) => new Date(b.captured_at) - new Date(a.captured_at))[0] || null;
      current.captured_at = new Date().toISOString();
      snapshots.push(current);
      saveSnapshots(snapshots);
      output.innerHTML = renderResult(current.username, current, previous);
    }).catch((error) => {
      output.innerHTML = `<div class="pt-error">${escapeHtml(error.message || "Dosya okunamadı.")}</div>`;
    });
  }

  function createPanel() {
    const old = document.getElementById(PANEL_ID);
    if (old) old.remove();
    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="pt-header"><div><h2>PhantomTrace</h2><p>Yerel snapshot karşılaştırıcı</p></div><button data-close>×</button></div>
      <p class="pt-muted">Instagram oturumu okunmaz. Yalnızca seçtiğiniz JSON/CSV dosyası işlenir.</p>
      <input data-file type="file" accept=".json,.csv,application/json,text/csv" hidden>
      <div class="pt-actions"><button data-import>Snapshot seç</button><button data-clear class="pt-danger">Kayıtları sil</button></div>
      <div data-output class="pt-output"><p class="pt-muted">İlk snapshot dosyanızı seçin.</p></div>`;
    document.body.appendChild(panel);
    const fileInput = panel.querySelector("[data-file]");
    const output = panel.querySelector("[data-output]");
    panel.querySelector("[data-import]").onclick = () => fileInput.click();
    fileInput.onchange = () => { if (fileInput.files[0]) importSnapshot(fileInput.files[0], output); };
    panel.querySelector("[data-close]").onclick = () => panel.remove();
    panel.querySelector("[data-clear]").onclick = () => {
      if (confirm("PhantomTrace localStorage kayıtları silinsin mi?")) {
        localStorage.removeItem(STORAGE_KEY);
        output.innerHTML = '<div class="pt-success">Tüm yerel kayıtlar silindi.</div>';
      }
    };
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `#${PANEL_ID}{position:fixed;z-index:2147483647;right:20px;bottom:20px;width:min(720px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto;background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:14px;box-shadow:0 16px 60px #0009;padding:20px;font:14px system-ui,sans-serif}#${PANEL_ID} *{box-sizing:border-box}#${PANEL_ID} h2{margin:0 0 4px}#${PANEL_ID} h3{margin:0 0 8px}.pt-header{display:flex;justify-content:space-between;align-items:start}.pt-header button{background:none;border:0;color:#94a3b8;font-size:25px;cursor:pointer}.pt-actions{display:flex;gap:8px;margin:16px 0}.pt-actions button{cursor:pointer;border:0;border-radius:8px;padding:9px 13px;background:#667eea;color:white}.pt-actions .pt-danger{background:#7f1d1d}.pt-card{background:#172033;border:1px solid #334155;border-radius:10px;padding:14px;margin-top:12px}.pt-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pt-muted{color:#94a3b8}.pt-green{color:#6ee7b7}.pt-red{color:#fca5a5}.pt-success{background:#064e3b;color:#a7f3d0;border-radius:8px;padding:10px;margin-top:10px}.pt-error{background:#7f1d1d;color:#fecaca;border-radius:8px;padding:10px;margin-top:10px}#${PANEL_ID} ul{padding-left:20px;line-height:1.6}@media(max-width:600px){.pt-columns{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  try {
    injectStyles();
    createPanel();
    console.info("PhantomTrace hazır. Panelden JSON/CSV snapshot seçebilirsiniz.");
  } catch (error) {
    console.error("PhantomTrace başlatılamadı:", error);
  }
})();
