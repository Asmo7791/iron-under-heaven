(() => {
"use strict";

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- i18n ---------- */
const L = window.IUH_I18N;
const LANG_ORDER = ["en", "zh-Hans", "zh-Hant", "ja", "es", "fr"];
const LANG_NAMES = { en: "English", "zh-Hans": "简体中文", "zh-Hant": "繁體中文", ja: "日本語", es: "Español", fr: "Français" };
const LOCALES = { en: "en-US", "zh-Hans": "zh-CN", "zh-Hant": "zh-TW", ja: "ja-JP", es: "es-ES", fr: "fr-FR" };
const LANG_FONTS = { "zh-Hans": "Noto+Serif+SC:wght@400;600;700", "zh-Hant": "Noto+Serif+TC:wght@400;600;700", ja: "Noto+Serif+JP:wght@400;600;700" };
const LANG_KEY = "iron-under-heaven-lang";
let LANG = "en";
try { const s = localStorage.getItem(LANG_KEY); if (s && L[s]) LANG = s; } catch (e) {}
function raw(key) { const d = L[LANG]; return d[key] !== undefined ? d[key] : L.en[key]; }
function t(key, p) {
  const v = raw(key);
  if (v === undefined) { console.warn("missing text", key); return key; }
  if (typeof v === "function") return v(p || {});
  if (typeof v !== "string") return v;
  return p ? v.replace(/\{(\w+)\}/g, (m, k) => (p[k] !== undefined ? p[k] : m)) : v;
}
function tn(key, n, p) {
  if (n > 1) { const d = L[LANG]; const k = d[key + ".pl"] !== undefined || (d[key] === undefined && L.en[key + ".pl"] !== undefined) ? key + ".pl" : key; return t(k, p); }
  return t(key, p);
}
function sealCh(c) { const m = raw("seals"); return (m && m[c]) || c; }
const fmt = n => Math.round(n).toLocaleString(LOCALES[LANG]);
const pct = p => (p * 100 < 1 && p > 0 ? "<1" : Math.round(p * 100)) + "%";
const wen = n => t("money", { n: fmt(n) });

/* ---------- data ---------- */
const TOURS = 3;
const DIFFS = { easy: { days: 3, fails: 3, q: .85, merit: 3 }, normal: { days: 4, fails: 3, q: 1, merit: 5 }, hard: { days: 5, fails: 2, q: 1.2, merit: 7 } };
const STAGES = { army: { q: 1, seal: "趙" }, marsh: { q: .95, seal: "牛" }, gao: { q: 1.1, seal: "錢" }, royal: { q: 1.2, seal: "工" } };
const KINDS = [
  { id: "jian", len: .72, wid: .82, mult: 1.0, minDay: 1 },
  { id: "dao", len: .70, wid: 1.1, mult: 1.05, curve: .55, minDay: 1 },
  { id: "spear", len: .36, wid: 1.05, mult: .85, minDay: 1 },
  { id: "bishou", len: .46, wid: .85, mult: .8, minDay: 1 },
  { id: "zmd", len: .9, wid: 1.25, mult: 1.45, curve: .2, minDay: 5 },
];
const OWNER_COUNT = 12;
const FAMILIES = {
  dragon:  { han: "龍", c1: "#eef6ff", c2: "#6f8fae", glow: "#9fd0ff", gem: "#bfe6ff" },
  bird:    { han: "朱", c1: "#ffd2a8", c2: "#a0281a", glow: "#ff5a2a", gem: "#ff3010" },
  jade:    { han: "玉", c1: "#e6f5ea", c2: "#4f8f6a", glow: "#8fe0b0", gem: "#6fd09a" },
  thunder: { han: "雷", c1: "#a8acc4", c2: "#262a3a", glow: "#b08aff", gem: "#9a6aff" },
};
const RELICS = { pendant: 160, hammer: 140, bellows: 90, charcoal: 130, incense: 220, talisman: 150, whetstone: 180, seal: 200 };
const WINE_COST = 70;
const STRONGBOX = 3;

/* ---------- state ---------- */
let S = null;
let SETUP = null;
const SAVE_KEY = "iron-under-heaven-v1";
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function loadSave() { try { const v = localStorage.getItem(SAVE_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function defaultSetup() { const d = t("defaults"); return { name: d.name, diff: "normal", wife: d.wife, wb: 3, dau: d.dau, db: 4, son: d.son }; }

function newRun(cfg) {
  S = {
    name: cfg.name, diff: cfg.diff,
    fam: { wife: { name: cfg.wife, beauty: cfg.wb, status: "home", role: "wife" }, dau: { name: cfg.dau, beauty: cfg.db, status: "home", role: "dau" }, son: { name: cfg.son, status: "home", role: "son" } },
    stage: "army", tour: 1, dayInTour: 1, globalDay: 1, fails: 0, silver: 0, merit: 0, grudge: 0, neighbor: 0,
    relics: {}, perks: {}, tp: {}, flags: {}, leaveDone: {}, vault: [], swords: [], sel: 0, phase: "pick",
    mode: "story", node: "prologue", wine: false, wineToday: false, incenseUsed: false, surge: 0, safe: 0,
    furnace: { g: 0, holding: false }, anvil: { p: 0, dir: 1 }, leave: 0, setup: cfg, note: null,
  };
  show("prologue");
}
const D = () => DIFFS[S.diff];
const stT = k => t(`st.${S.stage}.${k}`);
const curSword = () => S && S.swords[S.sel];
const women = () => [S.fam.wife, S.fam.dau];
const taken = () => women().filter(m => m.status === "taken");
const names = arr => t("join", { list: arr.map(m => esc(m.name)) });
function P(extra) { return Object.assign({ N: esc(S.name), W: esc(S.fam.wife.name), D: esc(S.fam.dau.name), B: esc(S.fam.son.name), days: D().days, fails: D().fails, merit: D().merit, m: S.merit, tour: S.tour, tours: TOURS }, extra || {}); }
function danger() {
  if (S.flags.protected) return 0;
  const home = women().filter(m => m.status === "home");
  if (!home.length) return 0;
  return Math.max(...home.map(m => m.beauty)) + S.grudge;
}
function quotaFor(k) { return Math.round(200 * Math.pow(1.2, k - 1) * D().q * STAGES[S.stage].q / 10) * 10; }
const quotaToday = () => Math.round(quotaFor(S.globalDay) * (S.wineToday ? .85 : 1));

/* ---------- weapons ---------- */
function makeSword(day, forceKind) {
  const kinds = KINDS.filter(k => k.minDay <= day);
  const kind = forceKind ? KINDS.find(k => k.id === forceKind) : pick(kinds);
  const seed = (Math.random() * 1e9) | 0, r = mulberry32(seed), fams = Object.keys(FAMILIES);
  return {
    kind, seed, owner: Math.floor(Math.random() * OWNER_COUNT), grade: 0, maxGrade: 0, broken: false, cracked: false,
    state: "raw", heat: 0, heatMax: 0, strikes: 0, family: fams[Math.floor(r() * fams.length)], keep: false, carried: false,
    chips: Array.from({ length: 8 }, () => ({ t: .08 + r() * .78, side: r() < .5 ? -1 : 1, w: .02 + r() * .025, d: .3 + r() * .35 })),
    rust: Array.from({ length: 26 }, () => ({ t: r(), v: r(), s: .4 + r() * .9, h: r() })),
    crackAt: .25 + r() * .5, crackSide: r() < .5 ? -1 : 1, crackJag: Array.from({ length: 6 }, () => r() - .5),
  };
}
function swordValue(s) {
  if (s.broken) return 10;
  return Math.round(40 * Math.pow(1.55, s.grade) * s.kind.mult * (S.relics.seal ? 1.2 : 1));
}
function swordTitle(s) {
  const g = s.grade;
  const tier = s.broken ? "shattered" : g === 0 ? "broken" : g < 2 ? "notched" : g < 4 ? "mended" : g < 6 ? "fine" : g < 8 ? "superior" : g < 10 ? "treasured" : g >= 14 ? "divine" : "fam";
  return t("swordTitle", { tier, g, kind: t("kind." + s.kind.id), fam: t("fam." + s.family) });
}
const famName = s => t("fam." + s.family);

/* ---------- odds ---------- */
function breakChance(s, q) {
  let pb = 0.03 + 0.045 * s.grade;
  if (s.cracked) pb += 0.06;
  if (S.relics.pendant) pb *= 0.8;
  if (q === "perfect") pb *= 0.5; else if (q === "miss") pb *= 1.4;
  return clamp(pb, 0, 0.75);
}
const DIST = { perfect: { G: .34, S: .46, H: .12, D: .08 }, good: { G: .12, S: .50, H: .20, D: .18 }, miss: { G: .03, S: .32, H: .27, D: .38 } };
function odds(s, q) {
  const pb = breakChance(s, q), rest = 1 - pb, d = DIST[q];
  let H = d.H, Sx = d.S;
  if (S.relics.whetstone) { Sx += H / 2; H /= 2; }
  return { G: d.G * rest, S: Sx * rest, H: H * rest, D: d.D * rest, B: pb };
}
function zoneWidths() { const m = S.relics.hammer ? 1.6 : 1; return { perfect: .075 * m, good: .30 * m }; }
const surgeNeed = () => S.relics.talisman ? 7 : 10;

/*CANVAS*/

/* ---------- side panels ---------- */
function say(txt) { $("speech").textContent = txt; const sl = $("seal"); sl.classList.add("bump"); setTimeout(() => sl.classList.remove("bump"), 250); }
let patronKey = null;
function setPatron(key) { patronKey = key; const [name, role, seal] = key === "stage" ? [stT("patron"), stT("role"), STAGES[S.stage].seal] : [t(key), t(key + ".role"), raw(key + ".seal") || "家"]; $("pName").textContent = name; $("pRole").textContent = role; $("seal").textContent = sealCh(seal); }
const STATUS_CLS = { home: "good", taken: "bad", hidden: "good", married: "good", sold: "bad", with: "good", neighbor: "", capital: "good" };
function renderFamily() {
  if (!S) { $("family").innerHTML = ""; $("relicList").innerHTML = ""; return; }
  const f = S.fam;
  const row = (m, stars) => `<div class="member ${STATUS_CLS[m.status] || ""}"><b>${esc(m.name)}</b> <span class="muted">${t("role." + m.role)}</span>${stars ? `<span class="stars" title="${t("beauty")[m.beauty - 1]}">${"★".repeat(m.beauty)}${"☆".repeat(5 - m.beauty)}</span>` : ""}<span class="status">${t("status." + m.status)}</span></div>`;
  $("family").innerHTML = row(f.wife, true) + row(f.dau, true) + row(f.son, false) + (S.neighbor > 0 ? `<div class="member"><b>${t("npc.granny")}</b> <span class="muted">${t("role.neighbor")}</span><span class="status">${S.neighbor >= 2 ? t("granny.2") : t("granny.1")}</span></div>` : "");
  const ids = Object.keys(S.relics), perks = [];
  const pk = (k, p) => `<div class="relic"><b>${t(k)}</b>${t(k + ".d", p)}</div>`;
  if (S.perks.bellows) perks.push(pk("perk.bellows", P()));
  if (S.tp.injured) perks.push(pk("perk.injured"));
  if (S.tp.rested) perks.push(pk("perk.rested"));
  if (S.tp.incense && !S.tp.incenseUsed) perks.push(pk("perk.temple"));
  $("relicList").innerHTML = ids.map(id => `<div class="relic${id === "incense" && S.incenseUsed ? " used" : ""}"><b>${t("relic." + id)}</b>${t("relic." + id + ".d")}</div>`).join("") + perks.join("") || `<div class="muted">${t("ui.noCharms")}</div>`;
}
function renderHUD() {
  if (!S) { $("hStage").textContent = t("ui.subtitle"); renderFamily(); return; }
  const inForge = S.mode === "forge" || S.mode === "after";
  $("hStage").textContent = stT("name");
  $("hTour").textContent = `${Math.min(S.tour, TOURS)}/${TOURS} · ${inForge ? S.dayInTour + "/" + D().days : t("hud.leave")}`;
  $("hQuotaLbl").textContent = S.mode === "challenge" ? t("hud.goal") : t("hud.quota");
  $("hQuota").textContent = S.mode === "challenge" ? CHALLENGES[S.challenge].goal : fmt(quotaToday());
  $("hGold").textContent = fmt(S.silver);
  $("hMerit").textContent = S.merit;
  $("hWarn").textContent = `${S.fails} / ${D().fails}`;
  $("hWarnChip").classList.toggle("warn", S.fails > 0);
  const total = offeredTotal();
  $("ledger").hidden = S.mode === "challenge";
  $("lgTotal").textContent = fmt(total); $("lgQuota").textContent = fmt(quotaToday());
  $("lgBar").classList.toggle("met", total >= quotaToday());
  $("lgBar").firstElementChild.style.width = clamp(total / quotaToday() * 100, 0, 100) + "%";
  renderFamily();
}
const keptCount = () => S.swords.filter(s => s.keep).length;
const offered = () => S.swords.filter(s => s.state === "done" && !s.keep);
const offeredTotal = () => S ? offered().reduce((a, s) => a + swordValue(s), 0) : 0;
function renderRack() {
  if (!S) { $("rack").innerHTML = ""; return; }
  const ch = S.mode === "challenge";
  $("rack").innerHTML = S.swords.map((s, i) => {
    const v = wen(swordValue(s));
    const st = s.broken ? t("rack.scrap") : s.state === "done" ? (ch ? t("rack.finished") : s.keep ? t("rack.inBox", { v }) : t("rack.handing", { v })) : s.state === "heated" ? t("rack.anvil", { v }) : t("rack.waiting");
    const busy = S.phase === "anvil" || S.phase === "furnace";
    const cls = ["card", i === S.sel ? "active" : "", s.broken ? "broken" : "", s.state === "done" ? "done" : "", s.keep ? "kept" : ""].join(" ");
    const canKeep = !ch && s.state === "done" && !s.broken, full = !s.keep && keptCount() >= STRONGBOX;
    return `<div class="slot"><button class="${cls}" data-i="${i}" ${busy && i !== S.sel ? "disabled" : ""}><span class="nm">${s.carried ? `<span class="tag">${t("rack.fromBox")}</span>` : ""}${swordTitle(s)}</span><span class="gr">${s.broken ? t("rack.scrapTag") : "+" + s.grade}</span><span class="st">${st}</span></button>${canKeep ? `<button class="keep${s.keep ? " on" : ""}" data-k="${i}" aria-pressed="${!!s.keep}" ${full ? "disabled" : ""}>${s.keep ? t("rack.unkeep") : full ? t("rack.full") : t("rack.keep")}</button>` : ""}</div>`;
  }).join("");
  $("rack").querySelectorAll(".card").forEach(b => b.onclick = () => { if (S.phase === "anvil" || S.phase === "furnace") return; S.sel = +b.dataset.i; setPhase("pick"); });
  $("rack").querySelectorAll(".keep").forEach(b => b.onclick = () => { const sw = S.swords[+b.dataset.k]; if (!sw.keep && keptCount() >= STRONGBOX) return; sw.keep = !sw.keep; if (S.phase === "pick") setPhase("pick"); else { renderRack(); renderHUD(); } });
}
function renderName() {
  const s = curSword(); if (!s) { $("swName").textContent = ""; $("swVal").textContent = ""; return; }
  $("swName").textContent = swordTitle(s);
  $("swVal").textContent = t("sw.owner", { owner: t("owners")[s.owner], v: wen(swordValue(s)) });
}

/* ---------- forge phases ---------- */
const panel = $("panel");
function setPhase(ph) {
  if (!S) { panel.innerHTML = `<div class="title">${t("ph.cold")}</div><p>${t("ph.cold.d")}</p>`; renderRack(); renderName(); renderHUD(); return; }
  S.phase = ph; const s = curSword();
  if (!s) { panel.innerHTML = `<div class="title">${t("ph.quiet")}</div><p>${t("ph.quiet.d")}</p>`; renderRack(); renderName(); renderHUD(); return; }
  if (ph === "pick") {
    if (s.state === "raw") {
      panel.innerHTML = `<div class="title">${t("ph.furnace")}</div><p>${t("ph.furnace.d", { kind: t("kind." + s.kind.id) })}</p><div class="row"><button class="btn big" id="toFurnace">${t("ph.furnace.btn")}</button></div>`;
      $("toFurnace").onclick = () => setPhase("furnace");
    } else if (S.mode === "challenge") {
      panel.innerHTML = `<div class="title">${t("ph.finished")}</div><p>${t("ph.bladeDone")}</p>`;
    } else {
      const left = S.swords.filter(x => x.state !== "done").length;
      if (left) {
        panel.innerHTML = `<div class="title">${s.broken ? t("ph.lost") : t("ph.finished")}</div><p>${t("ph.pickAnother")}</p><div class="row"><button class="btn" id="nextSw">${t("ph.next")}</button></div>`;
        $("nextSw").onclick = () => { S.sel = S.swords.findIndex(x => x.state !== "done"); setPhase("pick"); };
      } else {
        const total = offeredTotal(), q = quotaToday(), k = keptCount();
        panel.innerHTML = `<div class="title">${t("ph.dusk")}</div><p>${t("ph.dusk.d", { total: wen(total), q: wen(q) })} ${total >= q ? t("ph.dusk.ok", { patron: stT("patron") }) : t("ph.dusk.short")}${k ? " " + tn("ph.dusk.kept", k, { k }) : ""}</p><p class="muted">${t("ph.dusk.hint")}</p><div class="row"><button class="btn big" id="ringBell">${t("ph.handIn", { patron: stT("patron") })}</button></div>`;
        $("ringBell").onclick = tribute;
      }
    }
  } else if (ph === "furnace") {
    S.furnace.g = 0; S.furnace.holding = false; S.furnace.done = false;
    const wide = S.relics.bellows || S.perks.bellows;
    const w = wide ? [52, 92] : [60, 88], p = wide ? [70, 84] : [73, 81];
    S.furnace.zone = w; S.furnace.pz = p;
    panel.innerHTML = `<div class="title">${t("ph.heat")}</div>
      <div class="gauge"><div class="fill" id="fFill" style="width:0%"></div>
        <div class="zone" style="left:${w[0] / 1.1}%;width:${(w[1] - w[0]) / 1.1}%;background:rgba(255,160,40,.18);border-left:1px dashed #ffb050;border-right:1px dashed #ffb050"></div>
        <div class="zone" style="left:${p[0] / 1.1}%;width:${(p[1] - p[0]) / 1.1}%;background:rgba(255,230,140,.25)"></div>
        <div class="zone" style="left:${92 / 1.1}%;right:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.15) 0 6px,transparent 6px 12px)"></div>
        <span class="lbl" style="left:${w[0] / 1.1 + 1}%">${t("ph.heat.forging")}</span><span class="lbl" style="right:4px">${t("ph.heat.cracks")}</span></div>
      <div class="legend"><span><i style="background:rgba(255,160,40,.5)"></i>${t("ph.heat.good")}</span><span><i style="background:rgba(255,230,140,.8)"></i>${t("ph.heat.perfect")}</span><span><i style="background:#fff"></i>${t("ph.heat.over")}</span></div>
      <div class="row"><button class="btn big" id="bellowsBtn">${t("ph.heat.btn")}</button></div><span class="kbd">${t("ph.heat.kbd")}</span>`;
    const b = $("bellowsBtn");
    b.addEventListener("pointerdown", e => { e.preventDefault(); startBellows(); }); b.addEventListener("pointerup", e => { e.preventDefault(); stopBellows(); });
    b.addEventListener("pointerleave", () => S.furnace.holding && stopBellows()); b.addEventListener("pointercancel", () => stopBellows()); b.addEventListener("contextmenu", e => e.preventDefault());
  } else if (ph === "anvil") {
    S.anvil.p = Math.random(); S.anvil.dir = 1;
    panel.innerHTML = `<div class="title">${t("ph.strike")}</div>
      <div class="gauge"><div class="zone" id="tGood"></div><div class="zone" id="tPerf"></div><div class="marker" id="tMark"></div></div>
      <div class="odds" id="odds"></div>
      <div class="meters"><div class="meter"><small><span>${t("ph.heatLbl")}</span><span id="heatTxt"></span></small><div class="bar heat"><div id="heatBar"></div></div></div>
        <div class="meter" id="surgeMeter" title="${esc(t("ph.spirit.tip"))}"><small><span>${t("ph.spirit")}</span><span id="surgeTxt"></span></small><div class="bar surge"><div id="surgeBar"></div></div></div></div>
      <div class="row"><button class="btn big" id="strikeBtn">${t("ph.strikeBtn")}</button><button class="btn ghost" id="quenchBtn"></button></div>
      <span class="kbd">${t("ph.strike.kbd")}</span>`;
    const z = zoneWidths();
    Object.assign($("tGood").style, { left: (50 - z.good * 50) + "%", width: z.good * 100 + "%", background: "rgba(111,191,142,.25)" });
    Object.assign($("tPerf").style, { left: (50 - z.perfect * 50) + "%", width: z.perfect * 100 + "%", background: "rgba(255,230,140,.6)" });
    $("strikeBtn").addEventListener("pointerdown", e => { e.preventDefault(); strike(); });
    $("quenchBtn").onclick = quench;
    updateAnvilPanel();
  }
  renderRack(); renderName(); renderHUD();
}
function updateAnvilPanel() {
  const s = curSword(); if (!s || S.phase !== "anvil" || !$("odds")) return;
  const o = odds(s, "good"), surging = S.safe > 0;
  const cell = (c, l, v) => `<div class="${c}"><small>${t(l)}</small><b>${pct(v)}</b></div>`;
  $("odds").innerHTML = surging ? cell("o-great", "odds.great", .3) + cell("o-succ", "odds.succ", .55) + cell("o-hold", "odds.hold", .15) + cell("o-dmg", "odds.notch", 0) + cell("o-break", "odds.shatter", 0)
    : cell("o-great", "odds.great", o.G) + cell("o-succ", "odds.succ", o.S) + cell("o-hold", "odds.hold", o.H) + cell("o-dmg", "odds.notch", o.D) + cell("o-break", "odds.shatter", o.B);
  const left = Math.max(0, Math.ceil(s.heat / 8));
  $("heatTxt").textContent = tn("ph.strikesLeft", left === 1 ? 1 : 2, { n: left });
  $("heatBar").style.width = clamp(s.heat / Math.max(1, s.heatMax) * 100, 0, 100) + "%";
  $("surgeTxt").textContent = surging ? tn("ph.safeLeft", S.safe === 1 ? 1 : 2, { n: S.safe }) : `${S.surge} / ${surgeNeed()}`;
  $("surgeBar").style.width = (surging ? S.safe / 5 * 100 : S.surge / surgeNeed() * 100) + "%";
  $("surgeMeter").classList.toggle("surging", surging);
  $("quenchBtn").textContent = t("ph.quench", { v: S.mode === "challenge" ? "+" + s.grade : wen(swordValue(s)) });
}
function startBellows() { if (S.phase !== "furnace" || S.furnace.done) return; S.furnace.holding = true; $("bellowsBtn")?.classList.add("held"); bellows(true); }
function stopBellows() {
  if (!S || S.phase !== "furnace" || !S.furnace.holding) return;
  S.furnace.holding = false; bellows(false); $("bellowsBtn")?.classList.remove("held");
  const g = S.furnace.g; if (g < 8) return;
  S.furnace.done = true;
  const s = curSword(), [z0, z1] = S.furnace.zone, [p0, p1] = S.furnace.pz;
  let heat = g, msg;
  if (g > 92) { s.cracked = true; heat = 85; msg = ["fx.white", "#ff8a6a"]; thud(); }
  else if (g >= p0 && g <= p1) { heat = 104; msg = ["fx.perfectHeat", "#ffe68a"]; }
  else if (g >= z0 && g <= z1) { heat = 84; msg = ["fx.goodHeat", "#ffb050"]; }
  else if (g < z0) { heat = Math.max(24, g * .9); msg = ["fx.warm", "#c9a080"]; }
  else { heat = 84; msg = ["fx.hot", "#ffb050"]; }
  if (S.relics.charcoal) heat += 24;
  if (S.tp.rested) heat += 16;
  if (S.tp.injured) heat = Math.max(16, heat - 16);
  s.heat = heat; s.heatMax = heat; s.state = "heated";
  floatText(t(msg[0]), msg[1], g >= p0 && g <= p1);
  sparks(CW / 2, CH * .6, 30, "#ffcf6a");
  setTimeout(() => setPhase("anvil"), 650);
}
function timingQuality() { const d = Math.abs(S.anvil.p - .5), z = zoneWidths(); return d <= z.perfect / 2 ? "perfect" : d <= z.good / 2 ? "good" : "miss"; }
function roll(o) { const r = Math.random(); let a = o.G; if (r < a) return "G"; a += o.S; if (r < a) return "S"; a += o.H; if (r < a) return "H"; a += o.D; if (r < a) return "D"; return "B"; }
let strikeCd = 0;
function strike() {
  const s = curSword(); if (!S || S.phase !== "anvil" || !s || s.state !== "heated" || strikeCd > 0) return;
  ac();
  const surging = S.safe > 0;
  strikeCd = .22; floats.length = 0;
  const q = surging ? "perfect" : timingQuality();
  let res;
  if (surging) { S.safe--; const r = Math.random(); res = r < .3 ? "G" : r < .85 ? "S" : "H"; }
  else res = roll(odds(s, q));
  if (res === "B" && S.relics.incense && !S.incenseUsed) { S.incenseUsed = true; res = "D"; floatText(t("fx.incense"), "#ffb050"); }
  else if (res === "B" && S.tp.incense && !S.tp.incenseUsed) { S.tp.incenseUsed = true; res = "D"; floatText(t("fx.blessing"), "#ffb050"); }
  const g = geom(s); hammerX = s.kind.id === "spear" ? rnd(.2, .6) : rnd(.2, .7); hammerAnim = 1;
  const hx = g.x0 + hammerX * g.L, hy = g.cy - g.W0;
  s.strikes++;
  if (res === "B") {
    s.broken = true; s.state = "done"; s.heat = 0; s.breakT = clamp(hammerX + rnd(-.05, .05), .2, .8); s.brokeAt = performance.now() / 1000;
    shatter(); shake = 14; flash = .5; flashColor = "#ff4020"; sparks(hx, hy, 70, "#ffd27a", 420);
    floatText(t("fx.shattered"), "#ff5a3a", true); if (S.mode !== "challenge") say(pick(stT("brk")));
    finishSword(); return;
  }
  const pf = q === "perfect" && !surging ? t("fx.perfectHit") : "";
  if (res === "G") { s.grade += 2; clang(1.2, 1.15); shake = 6; sparks(hx, hy, 45, "#ffe68a", 380); floatText(t("fx.great") + pf, "#ffd76a", true); if (!surging && Math.random() < .5 && S.mode !== "challenge") say(pick(stT("great"))); }
  else if (res === "S") { s.grade += 1; clang(1, 1); shake = 3; sparks(hx, hy, 24); floatText("+1" + pf, "#9fe0aa"); }
  else if (res === "H") { clang(.6, .85); sparks(hx, hy, 8, "#c9a080"); floatText(t("fx.hold") + pf, "#b0a090"); }
  else if (res === "D") { s.grade = Math.max(0, s.grade - 1); clang(.8, .7); thud(); shake = 5; sparks(hx, hy, 14, "#e08a5a"); floatText(t("fx.notched"), "#e08a5a"); }
  if (s.grade > s.maxGrade) { if (s.maxGrade < 10 && s.grade >= 10) { floatText(famName(s) + "!", FAMILIES[s.family].glow, true); flash = .6; flashColor = FAMILIES[s.family].glow; gong(); } s.maxGrade = s.grade; }
  if (!surging) {
    s.heat -= 8; S.surge++;
    if (S.surge >= surgeNeed()) { S.surge = 0; S.safe = 5; if (S.mode !== "challenge") say(stT("surge")); gong(); flash = .4; flashColor = "#ff6a20"; setTimeout(() => floatText(t("fx.spirit"), "#ff8a3a", true), 500); }
  }
  updateAnvilPanel(); renderRack(); renderName(); renderHUD();
  if (s.heat <= 0 && S.safe <= 0) setTimeout(() => { if (curSword() === s && s.state === "heated") { floatText(t("fx.cooled"), "#9ab"); quench(); } }, 350);
}
function quench() {
  const s = curSword(); if (!S || S.phase !== "anvil" || !s || s.state !== "heated") return;
  s.state = "done"; s.heat = 0; hiss(); steam(CW / 2, CH * .7, 30);
  floatText(S.mode === "challenge" ? `+${s.grade}` : wen(swordValue(s)), "#d5a74a", true);
  finishSword();
}
function finishSword() {
  S.phase = "done";
  setTimeout(() => {
    if (S.mode === "challenge") { const s = S.swords[0]; const id = S.challenge; S.swords = []; S.mode = "story"; CHALLENGES[id].done(s.broken ? -1 : s.grade, s); return; }
    const nx = S.swords.findIndex(x => x.state !== "done");
    if (nx >= 0) S.sel = nx;
    setPhase("pick");
  }, 1300);
  renderRack(); renderHUD(); renderName();
}

/* ---------- views (re-rendered when the language changes) ---------- */
let lastView = null;
function view(fn) { lastView = fn; fn(); }

/* ---------- days and tours ---------- */
function beginTour() {
  S.mode = "forge"; S.dayInTour = 1; S.fails = 0;
  S.tp = { feast: !!S.perks.feast, incense: !!S.perks.temple, rested: !!S.perks.rested, injured: !!S.perks.injured };
  delete S.perks.feast; delete S.perks.temple; delete S.perks.rested; delete S.perks.injured;
  S.surge = S.tp.feast ? 5 : 0; S.safe = 0;
  startDay();
}
function startDay() {
  S.mode = "forge";
  S.wineToday = S.wine; S.wine = false; S.incenseUsed = false;
  const vault = (S.vault || []).map(v => Object.assign(v, { keep: false, carried: true }));
  S.vault = [];
  S.dayVault = vault;
  S.swords = [...vault, makeSword(S.globalDay), makeSword(S.globalDay), makeSword(S.globalDay)]; S.sel = vault.length;
  save();
  setPatron("stage");
  view(renderDayIntro);
  setPhase("pick");
}
function renderDayIntro() {
  const q = quotaToday(), firstOfTour = S.dayInTour === 1, vn = S.dayVault ? S.dayVault.length : 0;
  const body = `<div class="eyebrow">${t("day.eb", { stage: stT("name"), tour: S.tour, tours: TOURS })}</div><div class="head"><div class="seal">${sealCh(STAGES[S.stage].seal)}</div><h2>${t("day.title", { d: S.dayInTour, days: D().days })}</h2></div>
    <p>${firstOfTour ? t("tour." + S.stage, P()) : t("day.more")}${vn ? " " + tn("day.vault", vn, { n: vn }) : ""}</p>
    <p>${t("day.quota", { q: wen(q) })}${S.wineToday ? t("day.wine", { patron: stT("patron") }) : ""} ${t("day.fails", { f: S.fails, max: D().fails })}${S.dayInTour === D().days && S.tour < TOURS ? " " + t("day.lastBeforeLeave") : ""}</p>
    ${firstOfTour && S.tp.feast ? `<p class="note">${t("day.feast")}</p>` : ""}
    <div class="row"><button class="btn big" id="mGo">${t("day.go")}</button></div>`;
  showScroll(body);
  $("mGo").onclick = () => { ac(); hideModal(); lastView = null; say(pick(stT("dawn"))); };
}
function tribute() {
  const off = offered(), kept = S.swords.filter(s => s.keep && !s.broken);
  const total = offeredTotal(), q = quotaToday(), pass = total >= q;
  S.vault = kept;
  const stipend = 40, earned = pass ? total - q + stipend : 0;
  S.silver += earned;
  let meritGain = 0;
  if (pass) { meritGain = 1 + (total >= q * 1.5 ? 1 : 0); S.merit += meritGain; } else S.fails++;
  coins(); if (!pass) thud();
  say(pick(stT(pass ? "pass" : "fail")));
  const res = { off: off.map(s => ({ title: swordTitle(s), v: swordValue(s), s })), kept, total, q, pass, earned, stipend, meritGain, day: S.dayInTour, tour: S.tour, failedOut: S.fails >= D().fails, lastDay: S.dayInTour >= D().days };
  S.globalDay++;
  if (res.failedOut) S.mode = "story"; else { S.mode = "after"; S.lastDay = res.lastDay; save(); }
  view(() => renderTribute(res));
  renderHUD();
}
function renderTribute(r) {
  const lines = r.off.length ? r.off.map(o => `<span>${swordTitle(o.s)}</span><span>${fmt(o.v)}</span>`).join("") : `<span class="muted">${t("tr.nothing")}</span><span></span>`;
  const keptNote = r.kept.length ? `<p class="muted">${t("tr.kept", { list: r.kept.map(s => `${swordTitle(s)} (${wen(swordValue(s))})`).join(", ") })}</p>` : "";
  let body = `<div class="eyebrow">${t("tr.eb", { stage: stT("name"), tour: r.tour, d: r.day })}</div><div class="head"><div class="seal">${sealCh(STAGES[S.stage].seal)}</div><h2>${r.pass ? t("tr.met") : t("tr.missed")}</h2></div>
    <div class="tally">${lines}<span class="tot">${t("tr.total")}</span><span class="tot">${fmt(r.total)}</span><span>${t("hud.quota")}</span><span>${fmt(r.q)}</span></div>
    <p>${r.pass ? t("tr.pass", { patron: stT("patron"), earned: wen(r.earned), stipend: r.stipend, merit: r.meritGain }) : t("tr.fail", { f: S.fails, max: D().fails })}</p>${keptNote}`;
  if (r.failedOut) { body += `<div class="row"><button class="btn big" id="mNext">${t("tr.consequences")}</button></div>`; showScroll(body); $("mNext").onclick = () => show("end_front"); return; }
  body += `<div class="row"><button class="btn big" id="mShop">${t("tr.toShop")}</button></div>`;
  showScroll(body); $("mShop").onclick = showShop;
}
function showShop() { S.mode = "after"; view(renderShop); }
function renderShop() {
  const avail = Object.keys(RELICS).filter(id => !S.relics[id]);
  if (!S.shopStock || S.shopDay !== S.globalDay) { S.shopStock = avail.sort(() => Math.random() - .5).slice(0, 3); S.shopDay = S.globalDay; }
  const stock = S.shopStock.filter(id => !S.relics[id]);
  const next = S.lastDay ? (S.tour < TOURS ? t("shop.leave") : t("shop.final")) : t("shop.sleep");
  const html = `<div class="eyebrow">${t("shop.eb")}</div><h2>${t("shop.title")}</h2><p>${t("shop.text", { s: wen(S.silver) })}</p>
    <div class="shop">${stock.map(id => `<div class="ware"><b>${t("relic." + id)}</b><button class="btn" data-buy="${id}" ${S.silver < RELICS[id] ? "disabled" : ""}>${fmt(RELICS[id])}</button><span>${t("relic." + id + ".d")}</span></div>`).join("")}
    ${S.lastDay ? "" : `<div class="ware"><b>${t("wine")}</b><button class="btn" data-buy="wine" ${S.silver < WINE_COST || S.wine ? "disabled" : ""}>${S.wine ? t("shop.bought") : WINE_COST}</button><span>${t("wine.d")}</span></div>`}</div>
    <div class="row"><button class="btn big" id="mSleep">${next}</button></div>`;
  showScroll(html);
  document.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
    const id = b.dataset.buy, cost = id === "wine" ? WINE_COST : RELICS[id]; if (S.silver < cost) return;
    S.silver -= cost; if (id === "wine") S.wine = true; else S.relics[id] = true; coins(); renderHUD(); save(); renderShop();
  });
  $("mSleep").onclick = () => {
    if (!S.lastDay) { S.dayInTour++; startDay(); return; }
    S.tour++;
    S.swords = []; S.sel = 0; setPhase("pick");
    if (S.tour > TOURS) return finale();
    startLeave();
  };
}

/* ---------- story engine ---------- */
function showScroll(inner) { $("modal").innerHTML = `<div class="scroll">${inner}</div>`; $("overlay").hidden = false; $("overlay").scrollTop = 0; const b = $("modal").querySelector(".btn:not(:disabled), .choice:not(:disabled)"); if (b) setTimeout(() => b.focus({ preventScroll: true }), 30); }
function hideModal() { $("overlay").hidden = true; }
function show(id) {
  S.mode = "story"; S.node = id; save();
  if (!S.swords.length) setPhase("pick");
  view(() => renderNode(id));
}
function renderNode(id) {
  const n = NODES[id]();
  setPatron(n.patron || "npc.village");
  const ch = n.choices.map((c, i) => {
    const cost = c.cost || 0;
    let why = c.req ? c.req() : null;
    if (!why && cost > S.silver) why = t("req.silver", { cost: fmt(cost), have: fmt(S.silver) });
    return `<button class="choice" data-c="${i}" ${why ? "disabled" : ""}><b>${c.t}${cost ? ` <span>(${wen(cost)})</span>` : ""}</b>${c.d ? `<span>${c.d}</span>` : ""}${why ? `<span class="why">${why}</span>` : ""}</button>`;
  }).join("");
  showScroll(`${n.eyebrow ? `<div class="eyebrow">${n.eyebrow}</div>` : ""}<div class="head">${n.seal ? `<div class="seal">${sealCh(n.seal)}</div>` : ""}<h2>${n.title}</h2></div>${n.text}<div class="choices">${ch}</div>`);
  $("modal").querySelectorAll(".choice").forEach(b => b.onclick = () => { const c = n.choices[+b.dataset.c]; if (c.cost) S.silver -= c.cost; renderHUD(); c.go(); });
  renderHUD();
}
const noteHtml = () => S.note ? `<p class="note">${t(S.note[0], P(S.note[1]))}</p>` : "";
const setNote = (k, p) => { S.note = [k, p || {}]; };

function startLeave() {
  S.mode = "story"; S.leave++; S.leaveDays = 3; S.eventDone = false; S.leaveDone = {}; S.note = null;
  S.swords = [];
  if (S.stage === "marsh") return show("marsh_leave");
  if (S.stage === "gao") return show("gao_leave");
  if (S.stage === "royal") return show("royal_leave");
  if (S.flags.drum && taken().length) { S.flags.drum = false; S.flags.drumChance = clamp(.4 + S.merit * .05, .4, .9); S.flags.drumWin = Math.random() < S.flags.drumChance; S.flags.drumWho = taken().map(m => m.role); return show("drum_result"); }
  if (taken().length) return show("empty_house");
  if (danger() >= 5) { abduct(); return show("empty_house"); }
  show("home_hub");
}
function abduct() {
  const home = women().filter(m => m.status === "home");
  let tk = home.filter(m => m.beauty >= 4);
  if (!tk.length) tk = [home.reduce((a, b) => (b.beauty > a.beauty ? b : a))];
  tk.forEach(m => m.status = "taken");
  S.fam.son.status = "neighbor";
  S.flags.abducted = true; S.flags.sawEmpty = false;
}
function afterActivity() {
  S.leaveDays--;
  if (!S.eventDone && S.leaveDays === 2) {
    S.eventDone = true; const d = danger();
    if (d >= 5) { abduct(); return show("abduct_now"); }
    if (d >= 4) return show("market");
    if (d >= 3) return show("matchmaker");
    return show("levy");
  }
  if (S.leaveDays <= 0) return show("leave_end");
  show("home_hub");
}
function leaveTour() { S.note = null; if (S.fam.son.status === "neighbor" && !taken().length) S.fam.son.status = "home"; beginTour(); }
function homeDesc() {
  const f = S.fam, bits = [], p = P();
  if (f.wife.status === "home") bits.push(t("home.wife", p));
  if (f.dau.status === "home") bits.push(t(f.dau.beauty >= 4 ? "home.dau4" : f.dau.beauty >= 3 ? "home.dau3" : "home.dau1", p));
  if (f.dau.status === "hidden") bits.push(t("home.dauHidden", p));
  if (f.dau.status === "married") bits.push(t("home.dauMarried", p));
  bits.push(t("home.son", p));
  return bits.join(" ");
}
const toMarsh = from => { S.stage = "marsh"; S.flags.wanted = true; ["wife", "dau", "son"].forEach(k => { if (from.includes(S.fam[k].status)) S.fam[k].status = "with"; }); S.grudge = 0; leaveTour(); };
const bladeName = g => g >= 0 ? t("blade.plus", { g }) : t("blade.broken");

const ACTIVITIES = [
  { id: "feast", cost: 40, go: () => { S.perks.feast = true; } },
  { id: "bellows", go: () => { S.perks.bellows = true; } },
  { id: "granny", go: () => { S.neighbor++; } },
  { id: "temple", cost: 30, go: () => { S.perks.temple = true; } },
  { id: "hide", cost: 50, show: () => S.fam.dau.status === "home" && danger() >= 3, go: () => { S.fam.dau.status = "hidden"; } },
  { id: "rest", go: () => { S.perks.rested = true; } },
];

const NODES = {
  prologue: () => ({ eyebrow: t("n.prologue.eb"), title: t("n.prologue.title"), seal: "戰", text: t("n.prologue.text", P()),
    choices: [{ t: t("n.prologue.c1"), go: () => beginTour() }] }),
  home_hub: () => ({
    eyebrow: t("n.hub.eb", { d: 4 - S.leaveDays }), title: S.leaveDays === 3 ? t("n.hub.title1") : t("n.hub.title"),
    text: `${S.leaveDays === 3 ? `<p>${t("n.hub.arrive", P())}</p>` : ""}${noteHtml()}<p>${homeDesc()}</p><p>${S.leaveDays === 3 ? t("n.hub.ask1") : t("n.hub.ask")}</p>`,
    choices: ACTIVITIES.filter(a => !S.leaveDone[a.id] && (!a.show || a.show())).map(a => ({ t: t(`act.${a.id}`, P()), d: t(`act.${a.id}.d`, P()), cost: a.cost, go: () => { S.leaveDone[a.id] = true; a.go(); setNote(`act.${a.id}.note`); afterActivity(); } })),
  }),
  leave_end: () => ({ eyebrow: t("n.end.eb"), title: t("n.end.title"), text: `${noteHtml()}<p>${t("n.end.text", P())}</p>`, choices: [{ t: t("n.end.c1"), go: leaveTour }] }),
  levy: () => ({ eyebrow: t("n.leave.eb"), title: t("n.levy.title"), seal: "高", patron: "npc.gaoYing", text: t("n.levy.text", P()),
    choices: [
      { t: t("n.levy.c1"), d: t("n.levy.c1.d"), cost: 60, go: () => { setNote("n.levy.c1.note"); afterActivity(); } },
      { t: t("n.levy.c2"), d: t("n.levy.c2.d"), go: () => { S.grudge++; setNote("n.levy.c2.note"); afterActivity(); } },
    ] }),
  matchmaker: () => ({ eyebrow: t("n.leave.eb"), title: t("n.mm.title"), seal: "媒", patron: "npc.liu", text: t("n.mm.text", P()),
    choices: [
      { t: t("n.mm.c1"), d: t("n.mm.c1.d", P()), go: () => { S.silver += 300; S.fam.dau.status = "sold"; S.grudge = 0; setNote("n.mm.c1.note"); afterActivity(); } },
      { t: t("n.mm.c2"), d: t("n.mm.c2.d"), go: () => { S.grudge++; setNote("n.mm.c2.note"); afterActivity(); } },
      { t: t("n.mm.c3", P()), d: t("n.mm.c3.d"), req: () => S.neighbor >= 1 || S.silver >= 100 ? null : t("n.mm.c3.req"), go: () => { if (S.neighbor < 1) S.silver -= 100; S.fam.dau.status = "married"; S.grudge++; setNote("n.mm.c3.note"); afterActivity(); } },
      { t: t("n.mm.c4"), d: t("n.mm.c4.d"), go: () => startChallenge("gift") },
    ] }),
  market: () => { const tgt = women().filter(m => m.status === "home").reduce((a, b) => (b.beauty > a.beauty ? b : a)); return {
    eyebrow: t("n.leave.eb"), title: t("n.market.title"), seal: "高", patron: "npc.gaoYing", text: t("n.market.text", P({ T: esc(tgt.name) })),
    choices: [
      { t: t("n.market.c1"), d: t("n.market.c1.d"), go: () => { S.grudge++; setNote("n.market.c1.note"); afterActivity(); } },
      { t: t("n.market.c2"), d: t("n.market.c2.d"), go: () => show("market_flee") },
      { t: t("n.market.c3"), d: t("n.market.c3.d"), req: () => S.merit >= D().merit ? null : t("n.market.c3.req", P()), go: () => { S.flags.protected = true; S.grudge = 0; setNote("n.market.c3.note"); afterActivity(); } },
      { t: t("n.market.c4"), d: t("n.market.c4.d"), cost: 150, go: () => { setNote("n.market.c4.note"); afterActivity(); } },
    ] }; },
  market_flee: () => ({ eyebrow: t("n.leave.eb"), title: t("n.flee.title"), seal: "逃", text: t("n.flee.text", P()),
    choices: [{ t: t("c.joinMarsh"), go: () => toMarsh(["home", "neighbor"]) }] }),
  abduct_now: () => ({ eyebrow: t("n.leave.eb"), title: t("n.abduct.title"), seal: "劫", text: tn("n.abduct.text", taken().length, P({ who: names(taken()) })),
    choices: [{ t: t("n.abduct.c1"), go: () => show("empty_house") }] }),
  empty_house: () => { const tk = taken(), first = !S.flags.sawEmpty, leave = fn => () => { S.flags.sawEmpty = true; fn(); }; return {
    eyebrow: t("n.leave.eb"), title: first ? t("n.empty.title") : t("n.empty.title2"), seal: "空",
    text: `${first ? t("n.empty.text", P({ who: names(tk) })) : ""}${noteHtml()}<p>${tn("n.empty.ask", tk.length, { who: names(tk) })}</p>`,
    choices: [
      { t: t("n.empty.c1"), d: t("n.empty.c1.d"), cost: 50, req: () => S.flags.thanked ? t("req.thanked") : null, go: leave(() => { S.flags.thanked = true; S.neighbor += 2; setNote("n.empty.c1.note"); show("empty_house"); }) },
      { t: t("n.empty.c2"), d: t("n.empty.c2.d"), cost: 200, req: () => S.flags.yamenDone ? t("req.yamen") : null, go: leave(() => { S.flags.yamenDone = true; show("yamen"); }) },
      { t: t("n.empty.c3"), d: t("n.empty.c3.d"), go: leave(() => startChallenge("raid")) },
      { t: t("n.empty.c4"), d: t("n.empty.c4.d", P()), req: () => S.flags.generalNo ? t("req.general") : null, go: leave(() => show(S.merit >= D().merit ? "general_yes" : "general_no")) },
      { t: t("n.empty.c5"), d: t("n.empty.c5.d"), cost: 100, req: () => S.flags.drum ? t("req.drum") : null, go: leave(() => show("drum")) },
    ] }; },
  yamen: () => ({ eyebrow: t("n.yamen.eb"), title: t("n.yamen.title"), seal: "官", patron: "npc.magistrate", text: t("n.yamen.text", P()),
    choices: [
      { t: t("n.yamen.c1"), d: t("n.yamen.c1.d"), go: () => { S.stage = "gao"; S.fam.son.status = "neighbor"; leaveTour(); } },
      { t: t("n.yamen.c2"), d: t("n.yamen.c2.d"), go: () => { S.perks.injured = true; setNote("n.yamen.c2.note"); show("empty_house"); } },
    ] }),
  raid_result: () => {
    const f = S.flags, g = f.raidGrade, who = names(women().filter(m => f.raidWho.includes(m.role))), n = f.raidWho.length;
    const chance = `<p class="muted">${t("chance", { p: Math.round(f.raidChance * 100) })}</p>`;
    return f.raidWin ? { eyebrow: t("n.night.eb"), title: t("n.raidWin.title"), seal: "救",
      text: `<p>${S.neighbor >= 2 ? t("n.raidWin.granny") + " " : ""}${t(g >= 6 ? "n.raidWin.lockEasy" : "n.raidWin.lockHard", { blade: bladeName(g) })}</p><p>${tn("n.raidWin.text", n, P({ who }))}</p>${chance}`,
      choices: [{ t: t("c.joinMarsh"), go: () => toMarsh(["home", "neighbor", "taken"]) }] }
    : { eyebrow: t("n.night.eb"), title: t("n.raidLose.title"), seal: "囚",
      text: `<p>${t(g < 0 ? "n.raidLose.useless" : "n.raidLose.notEnough", { blade: bladeName(g) })}</p><p>${t("n.raidLose.text")}</p>${chance}`,
      choices: [{ t: t("n.raidLose.c1"), d: t("c.bruised"), go: () => { S.stage = "gao"; S.perks.injured = true; leaveTour(); } }] };
  },
  general_yes: () => ({ eyebrow: t("n.general.eb"), title: t("n.genYes.title"), seal: "蒙", patron: "npc.general", text: tn("n.genYes.text", taken().length, P({ who: names(taken()) })),
    choices: [{ t: t("n.genYes.c1"), go: () => { women().forEach(m => { if (m.status === "taken" || m.status === "home") m.status = "capital"; }); S.fam.son.status = "capital"; S.stage = "royal"; S.grudge = 0; S.flags.protected = true; leaveTour(); } }] }),
  general_no: () => ({ eyebrow: t("n.general.eb"), title: t("n.genNo.title"), seal: "蒙", patron: "npc.general", text: t("n.genNo.text", P()),
    choices: [{ t: t("n.genNo.c1"), go: () => { S.flags.generalNo = true; setNote("n.genNo.note"); show("empty_house"); } }] }),
  drum: () => ({ eyebrow: t("n.drum.eb"), title: t("n.drum.title"), seal: "鼓", text: t("n.drum.text"),
    choices: [{ t: t("n.drum.c1"), d: t("n.drum.c1.d"), go: () => { S.flags.drum = true; leaveTour(); } }] }),
  drum_result: () => {
    const f = S.flags, who = names(women().filter(m => f.drumWho.includes(m.role))), n = f.drumWho.length;
    const chance = `<p class="muted">${t("chance", { p: Math.round(f.drumChance * 100) })}</p>`;
    return f.drumWin ? { eyebrow: t("n.leave.eb"), title: t("n.drumWin.title"), seal: "鼓", text: `<p>${tn("n.drumWin.text", n, { who })}</p>${chance}`,
      choices: [{ t: t("n.drumWin.c1"), go: () => { taken().forEach(m => m.status = "home"); S.fam.son.status = "home"; S.grudge = 0; S.flags.protected = true; S.leaveDays = 3; S.eventDone = true; S.note = null; show("home_hub"); } }] }
    : { eyebrow: t("n.leave.eb"), title: t("n.drumLose.title"), seal: "鼓", text: `<p>${tn("n.drumLose.text", n, { who })}</p>${chance}`,
      choices: [{ t: t("n.drumLose.c1"), go: () => { setNote("n.drumLose.note"); S.flags.sawEmpty = true; show("empty_house"); } }] };
  },
  marsh_leave: () => ({ eyebrow: t("n.marsh.eb"), title: t("n.marsh.title"), seal: "牛", patron: "stage", text: `${noteHtml()}${t("n.marsh.text", P())}`,
    choices: [
      { t: t("n.marsh.c1"), d: t("n.marsh.c1.d"), go: () => { S.stage = "army"; S.flags.wanted = false; S.flags.amnesty = true; S.flags.protected = true; ["wife", "dau", "son"].forEach(k => { if (S.fam[k].status === "with") S.fam[k].status = "home"; }); leaveTour(); } },
      { t: t("n.marsh.c2"), d: t("n.marsh.c2.d"), go: () => leaveTour() },
      { t: t("n.marsh.c3"), d: t("n.marsh.c3.d"), go: () => startChallenge("revenge") },
    ] }),
  gao_leave: () => ({ eyebrow: t("n.gao.eb"), title: t("n.gao.title"), seal: "錢", patron: "stage", text: t("n.gao.text", P({ who: names(taken().length ? taken() : women()) })),
    choices: [
      { t: t("n.gao.c1"), d: t("n.gao.c1.d"), go: () => startChallenge("ransom") },
      { t: t("n.gao.c2"), d: t("n.gao.c2.d"), go: () => { S.flags.escChance = clamp(.3 + S.neighbor * .12, .3, .85); S.flags.escWin = Math.random() < S.flags.escChance; show("gao_escape"); } },
      { t: t("n.gao.c3"), d: t("n.gao.c3.d"), go: () => { S.flags.endured = true; leaveTour(); } },
    ] }),
  gao_escape: () => { const f = S.flags, chance = `<p class="muted">${t("chance", { p: Math.round(f.escChance * 100) })}</p>`; return f.escWin
    ? { eyebrow: t("n.night.eb"), title: t("n.escWin.title"), seal: "逃", text: `<p>${t("n.escWin.text", P({ who: names(taken().length ? taken() : women()) }))}</p>${chance}`, choices: [{ t: t("c.joinMarsh"), go: () => toMarsh(["taken", "neighbor", "home"]) }] }
    : { eyebrow: t("n.night.eb"), title: t("n.escLose.title"), seal: "囚", text: `<p>${t("n.escLose.text")}</p>${chance}`, choices: [{ t: t("n.escLose.c1"), d: t("c.bruised"), go: () => { S.perks.injured = true; leaveTour(); } }] }; },
  royal_leave: () => ({ eyebrow: t("n.royal.eb"), title: t("n.royal.title"), seal: "工", patron: "stage", text: t("n.royal.text", P()),
    choices: [
      { t: t("n.royal.c1"), d: t("n.royal.c1.d"), go: () => { S.perks.feast = true; leaveTour(); } },
      { t: t("n.royal.c2", P()), d: t("n.royal.c2.d"), req: () => S.perks.bellows ? t("req.bellows") : null, go: () => { S.perks.bellows = true; leaveTour(); } },
      { t: t("n.royal.c3"), d: t("n.royal.c3.d"), req: () => S.relics.hammer ? t("req.hammer") : null, go: () => { S.relics.hammer = true; leaveTour(); } },
    ] }),
  ransom_win: () => ({ eyebrow: t("n.gao.eb"), title: t("n.ransom.title"), seal: "高", patron: "npc.gaoYing", text: t("n.ransom.text", P({ who: names(taken().length ? taken() : women()) })),
    choices: [{ t: t("n.ransom.c1"), go: () => { women().forEach(m => { if (m.status === "taken") m.status = "home"; }); S.fam.son.status = "home"; S.stage = "army"; S.grudge = 0; S.flags.protected = true; leaveTour(); } }] }),
  marsh_after: () => ({ eyebrow: t("n.marsh.eb"), title: S.flags.revenge ? t("n.marshAfter.win") : t("n.marshAfter.lose"), seal: "牛", patron: "stage",
    text: `${noteHtml()}<p>${t("n.marshAfter.text")}</p>`, choices: [{ t: t("c.backToForge"), go: leaveTour }] }),
};

/* ---------- challenges ---------- */
const CHALLENGES = {
  gift: { goal: "+5", kind: "jian", done: g => { if (g >= 5) { S.grudge = Math.max(0, S.grudge - 2); setNote("ch.gift.win", { g }); } else { S.grudge++; setNote(g < 0 ? "ch.gift.broke" : "ch.gift.lose", { g }); } afterActivity(); } },
  raid: { goal: "—", kind: "dao", done: g => { const f = S.flags; f.raidGrade = g; f.raidWho = taken().map(m => m.role); f.raidChance = g < 0 ? .05 : clamp(.15 + .07 * g + (S.neighbor >= 2 ? .1 : 0), .05, .95); f.raidWin = Math.random() < f.raidChance; show("raid_result"); } },
  ransom: { goal: "+8", kind: "jian", done: g => { if (g >= 8) show("ransom_win"); else { setNote(g < 0 ? "ch.ransom.broke" : "ch.ransom.lose", { g }); S.flags.endured = true; leaveTour(); } } },
  revenge: { goal: "+6", kind: "zmd", done: g => { if (g >= 6) { S.flags.revenge = true; S.silver += 400; setNote("ch.revenge.win"); } else setNote(g < 0 ? "ch.revenge.broke" : "ch.revenge.lose", { g }); show("marsh_after"); } },
  king: { goal: "+10", kind: "jian", done: g => { S.flags.kingGrade = g; show(g >= 10 ? "end_heaven" : "end_royal"); } },
};
function startChallenge(id) {
  const c = CHALLENGES[id];
  S.mode = "challenge"; S.challenge = id;
  S.swords = [makeSword(Math.max(S.globalDay, 5), c.kind)]; S.sel = 0; S.surge = 0; S.safe = 0;
  save();
  setPatron("npc.self");
  view(() => {
    showScroll(`<div class="eyebrow">${t("ch.eb")}</div><div class="head"><div class="seal">${sealCh("鐵")}</div><h2>${t("ch." + id + ".title")}</h2></div><p>${t("ch." + id + ".text", P({ who: names(taken()) }))}</p><p class="muted">${t("ch.hint")}</p><div class="row"><button class="btn big" id="mGo">${t("ch.go")}</button></div>`);
    $("mGo").onclick = () => { ac(); hideModal(); lastView = null; say(t("ch.say")); };
  });
  setPhase("pick");
}

/* ---------- endings ---------- */
function finale() {
  S.mode = "story";
  if (S.stage === "royal") return startChallenge("king");
  if (S.stage === "marsh") return show("end_outlaw");
  if (S.stage === "gao") return show("end_cage");
  if (taken().length) return show("end_empty");
  if (S.fam.dau.status === "sold") return show("end_bitter");
  show("end_home");
}
const ENDINGS = ["end_home", "end_bitter", "end_empty", "end_outlaw", "end_cage", "end_royal", "end_heaven", "end_front"];
const END_SEALS = { end_home: "家", end_bitter: "銀", end_empty: "空", end_outlaw: "義", end_cage: "籠", end_royal: "工", end_heaven: "天", end_front: "死" };
function endText(key) {
  const p = P();
  if (key === "end_home") return t("end.home.text", p) + " " + t(S.fam.dau.status === "married" ? "end.home.married" : S.fam.dau.status === "hidden" ? "end.home.hidden" : "end.home.grown", p) + " " + t("end.home.son", p) + "</p>";
  if (key === "end_empty") return tn("end.empty.text", taken().length, P({ who: names(taken()) }));
  if (key === "end_outlaw") { const w = women().filter(m => m.status === "with"); return `<p>${S.flags.revenge ? t("end.outlaw.revenge") + " " : ""}${t("end.outlaw.text")}</p><p>${w.length ? t("end.outlaw.with", P({ who: names(w) })) : t("end.outlaw.alone")}</p>`; }
  if (key === "end_royal") return t("end.royal.text", P({ blade: S.flags.kingGrade < 0 ? t("end.royal.second") : t("end.royal.sword", { g: S.flags.kingGrade }) }));
  if (key === "end_heaven") return t("end.heaven.text", P({ g: S.flags.kingGrade }));
  if (key === "end_front") return `<p>${stT("front")}</p><p class="muted">${t("end.front.hint")}</p>`;
  return t(key.replace("_", ".") + ".text", p);
}
ENDINGS.forEach(key => {
  NODES[key] = () => ({ eyebrow: t("end.eb", { n: ENDINGS.indexOf(key) + 1, total: ENDINGS.length }), title: t(key.replace("_", ".") + ".title"), seal: END_SEALS[key],
    text: endText(key) + `<div class="tally"><span>${t("end.days")}</span><span>${S.globalDay - 1}</span><span>${t("end.merit")}</span><span>${S.merit}</span><span>${t("end.silver")}</span><span>${wen(S.silver)}</span><span>${t("end.diff")}</span><span>${t("diff." + S.diff)}</span></div>`,
    choices: [{ t: t("end.again"), go: () => { clearSave(); newRun(S.setup); } }, { t: t("end.new"), go: () => { clearSave(); S = null; showSetup(false); } }] });
});

/* ---------- setup ---------- */
function troubleOf(wb, db) { const b = Math.max(wb, db); return b >= 5 ? ["trouble.5", "#9a2a1a"] : b >= 4 ? ["trouble.4", "#a5471a"] : b >= 3 ? ["trouble.3", "#8a6420"] : ["trouble.1", "#2f6a45"]; }
function readSetupForm() { if (!$("setupForm")) return; Object.assign(SETUP, { name: $("fName").value.trim(), wife: $("fWife").value.trim(), dau: $("fDau").value.trim(), son: $("fSon").value.trim() }); }
function showSetup(hasSave) {
  if (!SETUP) SETUP = defaultSetup();
  setPatron("npc.title"); say(t("setup.say"));
  view(() => renderSetup(hasSave));
  setPhase("pick");
}
function renderSetup(hasSave) {
  const c = SETUP;
  const seg = (key, val) => `<div class="seg" role="group">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-seg="${key}" data-v="${i}" aria-pressed="${val === i}" title="${t("beauty")[i - 1]}">${i}</button>`).join("")}</div>`;
  const [tr, tc] = troubleOf(c.wb, c.db);
  const diffHint = k => t("diff." + k + ".d", DIFFS[k]) + " " + t("setup.meritNeed", { m: DIFFS[k].merit });
  showScroll(`<div class="eyebrow">${t("ui.subtitle")}</div><div class="head"><div class="seal">${sealCh("鐵")}</div><h2>${t("ui.title")}</h2></div>
    <div class="field"><span class="lab">Language · 语言 · 言語 · Idioma · Langue</span><div class="langs" role="group">${LANG_ORDER.map(l => `<button type="button" data-lang="${l}" aria-pressed="${l === LANG}" lang="${l}">${LANG_NAMES[l]}</button>`).join("")}</div></div>
    <p>${t("setup.intro")}</p>
    ${hasSave ? `<div class="row"><button class="btn big" id="mCont">${t("setup.continue")}</button></div>` : ""}
    <form class="form" id="setupForm" autocomplete="off">
      <div class="field"><label for="fName">${t("setup.name")}</label><input type="text" id="fName" maxlength="20" value="${esc(c.name)}"></div>
      <div class="field"><span class="lab">${t("setup.diff")}</span><div class="seg" role="group">${Object.keys(DIFFS).map(k => `<button type="button" data-diff="${k}" aria-pressed="${c.diff === k}">${t("diff." + k)}</button>`).join("")}</div><span class="hint" id="diffHint">${diffHint(c.diff)}</span></div>
      <div class="fam-row"><div class="field"><label for="fWife">${t("setup.wife")}</label><input type="text" id="fWife" maxlength="16" value="${esc(c.wife)}"></div><div class="field"><span class="lab">${t("setup.beauty")}</span>${seg("wb", c.wb)}</div></div>
      <div class="fam-row"><div class="field"><label for="fDau">${t("setup.dau")}</label><input type="text" id="fDau" maxlength="16" value="${esc(c.dau)}"></div><div class="field"><span class="lab">${t("setup.beauty")}</span>${seg("db", c.db)}</div></div>
      <div class="field"><label for="fSon">${t("setup.son")}</label><input type="text" id="fSon" maxlength="16" value="${esc(c.son)}"></div>
      <p class="hint">${t("setup.beautyHelp", { list: t("beauty").map((b, i) => `${i + 1} ${b}`).join(t("listSep")) })} <span class="trouble" id="trouble" style="color:${tc}">${t(tr)}</span></p>
      <div class="row"><button class="btn big" type="submit">${t("setup.begin")}</button></div>
    </form>`);
  const upd = () => { const [k, col] = troubleOf(SETUP.wb, SETUP.db); const el = $("trouble"); el.textContent = t(k); el.style.color = col; $("diffHint").textContent = diffHint(SETUP.diff); };
  document.querySelectorAll("[data-seg]").forEach(b => b.onclick = () => { SETUP[b.dataset.seg] = +b.dataset.v; document.querySelectorAll(`[data-seg="${b.dataset.seg}"]`).forEach(x => x.setAttribute("aria-pressed", x === b)); upd(); });
  document.querySelectorAll("[data-diff]").forEach(b => b.onclick = () => { SETUP.diff = b.dataset.diff; document.querySelectorAll("[data-diff]").forEach(x => x.setAttribute("aria-pressed", x === b)); upd(); });
  document.querySelectorAll(".langs [data-lang]").forEach(b => b.onclick = () => setLang(b.dataset.lang));
  $("setupForm").addEventListener("submit", e => { e.preventDefault(); ac(); readSetupForm(); const d = t("defaults");
    Object.assign(SETUP, { name: SETUP.name || d.name, wife: SETUP.wife || d.wife, dau: SETUP.dau || d.dau, son: SETUP.son || d.son });
    clearSave(); lastView = null; newRun({ ...SETUP }); });
  if (hasSave) $("mCont").onclick = () => { ac(); lastView = null; resume(loadSave()); };
}
function resume(saved) {
  S = saved;
  if (!S.setup) S.setup = defaultSetup();
  if (S.note && !Array.isArray(S.note)) S.note = null;
  if (S.mode === "challenge") return startChallenge(S.challenge);
  if (S.mode === "after") return showShop();
  if (S.mode === "forge") { S.vault = S.dayVault || S.vault || []; S.wine = S.wine || S.wineToday; return startDay(); }
  show(S.node || "prologue");
}

/* ---------- language ---------- */
function loadFont(l) {
  const fam = LANG_FONTS[l]; if (!fam || document.getElementById("font-" + l)) return;
  const link = document.createElement("link"); link.id = "font-" + l; link.rel = "stylesheet"; link.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`; document.head.appendChild(link);
}
function applyStatic() {
  document.documentElement.lang = LANG; document.documentElement.dataset.lang = LANG;
  loadFont(LANG);
  document.title = t("ui.title");
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n, { n: STRONGBOX }); });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $("brandHan").textContent = sealCh("鐵");
  $("forge").setAttribute("aria-label", t("ui.canvas"));
  $("muteBtn").textContent = muted ? t("ui.soundOff") : t("ui.soundOn");
  const sel = $("langSel"); sel.innerHTML = LANG_ORDER.map(l => `<option value="${l}" ${l === LANG ? "selected" : ""}>${LANG_NAMES[l]}</option>`).join("");
}
function setLang(l) {
  if (!L[l] || l === LANG) return;
  readSetupForm();
  const oldDefaults = t("defaults");
  LANG = l; try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  if (SETUP) { const nd = t("defaults"); ["name", "wife", "dau", "son"].forEach(k => { if (!SETUP[k] || SETUP[k] === oldDefaults[k]) SETUP[k] = nd[k]; }); }
  applyStatic();
  if (patronKey) setPatron(patronKey);
  if (S && ["pick", "anvil"].includes(S.phase)) setPhase(S.phase); else { renderRack(); renderName(); renderHUD(); if (!S) setPhase("pick"); }
  if (!$("overlay").hidden && lastView) lastView();
}

/* ---------- input & loop ---------- */
document.addEventListener("keydown", e => {
  if (!$("overlay").hidden || !S) return;
  if (e.target && e.target.tagName === "SELECT") return;
  if (e.code === "Space") { e.preventDefault(); if (e.repeat && S.phase !== "anvil") return; if (S.phase === "furnace") startBellows(); else if (S.phase === "anvil") { if (!e.repeat) strike(); } else if (S.phase === "pick" && curSword() && curSword().state === "raw") setPhase("furnace"); }
  if (e.code === "KeyQ" && S.phase === "anvil") quench();
});
document.addEventListener("keyup", e => { if (e.code === "Space" && S && S.phase === "furnace") stopBellows(); });
$("muteBtn").onclick = () => { muted = !muted; $("muteBtn").textContent = muted ? t("ui.soundOff") : t("ui.soundOn"); $("muteBtn").setAttribute("aria-pressed", muted); if (muted) bellows(false); };
$("langSel").onchange = e => setLang(e.target.value);

let last = performance.now(), hudT = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  strikeCd = Math.max(0, strikeCd - dt);
  if (S && S.phase === "furnace" && $("fFill")) {
    const f = S.furnace, wide = S.relics.bellows || S.perks.bellows;
    if (f.holding && !f.done) f.g = Math.min(110, f.g + dt * (wide ? 26 : 34) * (1 + f.g / 90));
    else if (!f.done) f.g = Math.max(0, f.g - dt * 10);
    $("fFill").style.width = (f.g / 1.1) + "%";
  }
  if (S && S.phase === "anvil" && $("tMark") && curSword()) {
    const sp = .9 + .07 * curSword().grade;
    S.anvil.p += S.anvil.dir * sp * dt; if (S.anvil.p > 1) { S.anvil.p = 1; S.anvil.dir = -1; } if (S.anvil.p < 0) { S.anvil.p = 0; S.anvil.dir = 1; }
    $("tMark").style.left = (S.anvil.p * 100) + "%";
    hudT += dt; if (hudT > .1) { hudT = 0; updateAnvilPanel(); }
  }
  if (S) drawScene(dt); else { ctx.fillStyle = "#120d0a"; ctx.fillRect(0, 0, CW, CH); }
  requestAnimationFrame(frame);
}

resize();
applyStatic();
showSetup(!!loadSave());
requestAnimationFrame(frame);
})();
