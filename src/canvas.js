/* ---------- audio ---------- */
let AC = null, muted = false, bellowsNode = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === "suspended") AC.resume(); return AC; }
function noiseBuf(a, dur) { const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function clang(power = 1, pitch = 1) {
  const a = ac(); if (!a || muted) return; const t = a.currentTime;
  const out = a.createGain(); out.gain.value = .22 * power; out.connect(a.destination);
  [[523, 1], [1347, .6], [2210, .4], [3130, .25]].forEach(([f, g]) => { const o = a.createOscillator(), e = a.createGain(); o.type = "sine"; o.frequency.value = f * pitch * rnd(.98, 1.02); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.001, t + .6 + g); o.connect(e); e.connect(out); o.start(t); o.stop(t + 1.4); });
  const n = a.createBufferSource(); n.buffer = noiseBuf(a, .08); const nf = a.createBiquadFilter(); nf.type = "highpass"; nf.frequency.value = 2000; const ng = a.createGain(); ng.gain.setValueAtTime(.8, t); ng.gain.exponentialRampToValueAtTime(.01, t + .08); n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t);
}
function hiss(dur = 1.4) { const a = ac(); if (!a || muted) return; const t = a.currentTime; const n = a.createBufferSource(); n.buffer = noiseBuf(a, dur); const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 4500; f.Q.value = .6; const g = a.createGain(); g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.25, t + .05); g.gain.exponentialRampToValueAtTime(.001, t + dur); n.connect(f); f.connect(g); g.connect(a.destination); n.start(t); }
function shatter() { const a = ac(); if (!a || muted) return; const t = a.currentTime; for (let i = 0; i < 7; i++) { const o = a.createOscillator(), e = a.createGain(); o.type = "triangle"; o.frequency.value = rnd(1800, 5200); const st = t + i * .03 + rnd(0, .05); e.gain.setValueAtTime(.12, st); e.gain.exponentialRampToValueAtTime(.001, st + .35); o.connect(e); e.connect(a.destination); o.start(st); o.stop(st + .4); } const n = a.createBufferSource(); n.buffer = noiseBuf(a, .5); const g = a.createGain(); g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); n.connect(g); g.connect(a.destination); n.start(t); }
function thud() { const a = ac(); if (!a || muted) return; const t = a.currentTime; const o = a.createOscillator(), e = a.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + .2); e.gain.setValueAtTime(.4, t); e.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(e); e.connect(a.destination); o.start(t); o.stop(t + .3); }
function coins() { const a = ac(); if (!a || muted) return; const t = a.currentTime; for (let i = 0; i < 8; i++) { const o = a.createOscillator(), e = a.createGain(); o.type = "square"; o.frequency.value = rnd(2400, 3600); const st = t + i * .06; e.gain.setValueAtTime(.05, st); e.gain.exponentialRampToValueAtTime(.001, st + .12); o.connect(e); e.connect(a.destination); o.start(st); o.stop(st + .15); } }
function gong() { const a = ac(); if (!a || muted) return; const t = a.currentTime; [[98, .5], [147, .3], [196, .25], [277, .15]].forEach(([f, g]) => { const o = a.createOscillator(), e = a.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f * 1.04, t); o.frequency.exponentialRampToValueAtTime(f, t + .6); e.gain.setValueAtTime(.001, t); e.gain.exponentialRampToValueAtTime(g * .5, t + .03); e.gain.exponentialRampToValueAtTime(.001, t + 3); o.connect(e); e.connect(a.destination); o.start(t); o.stop(t + 3.1); }); }
function bellows(on) {
  const a = ac(); if (!a) return;
  if (on && !bellowsNode && !muted) { const n = a.createBufferSource(); n.buffer = noiseBuf(a, 2); n.loop = true; const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500; const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(.35, a.currentTime + .2); n.connect(f); f.connect(g); g.connect(a.destination); n.start(); bellowsNode = { n, g }; }
  else if (!on && bellowsNode) { const b = bellowsNode; bellowsNode = null; b.g.gain.linearRampToValueAtTime(0, a.currentTime + .15); setTimeout(() => { try { b.n.stop(); } catch (e) {} }, 250); }
}

/* ---------- canvas ---------- */
const cv = $("forge"), ctx = cv.getContext("2d");
let CW = 800, CH = 320, DPR = 1;
function resize() { DPR = Math.min(window.devicePixelRatio || 1, 2); CW = cv.parentElement.clientWidth; CH = Math.round(clamp(CW * .42, 210, 360)); cv.width = CW * DPR; cv.height = CH * DPR; cv.style.height = CH + "px"; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
window.addEventListener("resize", resize);
const parts = [], floats = [];
let shake = 0, hammerAnim = 0, hammerX = .5, flash = 0, flashColor = "#fff";
function sparks(x, y, n, col = "#ffb347", spd = 260) { for (let i = 0; i < n; i++) { const a = rnd(-Math.PI, 0), v = rnd(spd * .3, spd); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.3, .8), max: .8, c: col, s: rnd(1, 2.6), g: 600 }); } }
function steam(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-120, 120), y, vx: rnd(-20, 20), vy: rnd(-90, -30), life: rnd(.8, 1.8), max: 1.8, c: "steam", s: rnd(10, 26), g: -10 }); }
function floatText(txt, col, big = false) { floats.push({ txt, col, big, t: 0 }); }

function geom(s) {
  const W0 = CH * .062 * s.kind.wid;
  const L = CW * .70 * s.kind.len;
  const x0 = s.kind.id === "spear" ? CW * .5 : Math.max(CW * .2, (CW - L) / 2 + CW * .04);
  return { x0, L, cy: CH * .52, W0 };
}
const singleEdged = s => s.kind.id === "dao" || s.kind.id === "zmd";
function edgeAt(s, g, t) {
  const dmg = s.broken ? 1 : clamp(1 - s.grade / 2, 0, 1);
  const x = g.x0 + t * g.L;
  const curve = (s.kind.curve || 0) * g.W0 * 1.6;
  const yc = g.cy - curve * Math.sin(Math.PI * t * .9) * t;
  let base = g.W0 * (1 - .18 * t);
  if (s.kind.id === "spear") base = g.W0 * (.55 + 1.1 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * .3));
  let wt = base, wb = base;
  if (singleEdged(s)) { wt = base * .9; if (t > .82) { const k = (t - .82) / .18; wt = base * .9 * (1 - k); wb = base * (1 - k * k); } }
  else if (t > .86 && s.kind.id !== "spear") { const k = Math.max(0, (1 - t) / .14); wt *= k; wb *= k; }
  if (s.kind.id === "spear" && t > .9) { const k = Math.max(0, (1 - t) / .1); wt *= k; wb *= k; }
  if (dmg > 0) for (const c of s.chips) { if (singleEdged(s) && c.side < 0) continue; const k = 1 - Math.abs(t - c.t) / c.w; if (k > 0) { const dd = c.d * g.W0 * k * dmg; if (c.side < 0) wt = Math.max(base * .35, wt - dd); else wb = Math.max(base * .35, wb - dd); } }
  return { x, yc, wt, wb };
}
function heatRGB(h) {
  const stops = [[0, [0, 0, 0, 0]], [20, [120, 30, 10, .25]], [45, [200, 50, 15, .6]], [70, [255, 120, 30, .8]], [95, [255, 210, 120, .9]], [115, [255, 250, 220, .95]]];
  for (let i = 1; i < stops.length; i++) if (h <= stops[i][0]) { const [h0, a] = stops[i - 1], [h1, b] = stops[i]; const k = (h - h0) / (h1 - h0); return a.map((v, j) => lerp(v, b[j], k)); }
  return stops[stops.length - 1][1];
}
function bladePath(s, g, from = 0, to = 1) {
  const N = 70, top = [], bot = [];
  for (let i = 0; i <= N; i++) { const t = from + (to - from) * i / N; const e = edgeAt(s, g, t); top.push([e.x, e.yc - e.wt]); bot.push([e.x, e.yc + e.wb]); }
  ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const p of top) ctx.lineTo(p[0], p[1]); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
  return { top, bot };
}
function drawBlade(s, g, from, to, heat) {
  const fam = s.grade >= 10 ? FAMILIES[s.family] : null, tier = s.grade;
  const rust = s.broken ? .8 : clamp(1 - s.grade / 1.5, 0, 1);
  ctx.save();
  if (tier >= 8 && !s.broken) { ctx.shadowColor = fam ? fam.glow : "#ffd27a"; ctx.shadowBlur = 10 + Math.min(30, (tier - 8) * 4) + Math.sin(performance.now() / 300) * 4; }
  bladePath(s, g, from, to);
  const gr = ctx.createLinearGradient(0, g.cy - g.W0, 0, g.cy + g.W0);
  if (fam) { gr.addColorStop(0, fam.c1); gr.addColorStop(.5, fam.c1); gr.addColorStop(.52, fam.c2); gr.addColorStop(1, fam.c2); }
  else if (tier >= 2) { gr.addColorStop(0, "#e9eef2"); gr.addColorStop(.48, "#b9c2ca"); gr.addColorStop(.52, "#7c8790"); gr.addColorStop(1, "#4d555c"); }
  else { gr.addColorStop(0, "#8d8a84"); gr.addColorStop(.5, "#6e6a64"); gr.addColorStop(1, "#3c3833"); }
  ctx.fillStyle = gr; ctx.fill(); ctx.restore();
  ctx.save(); bladePath(s, g, from, to); ctx.clip();
  if (rust > 0) for (const b of s.rust) { if (b.t < from || b.t > to) continue; const e = edgeAt(s, g, b.t); const y = e.yc - e.wt + b.v * (e.wt + e.wb); ctx.fillStyle = `rgba(${110 + b.h * 50},${50 + b.h * 25},20,${.75 * rust})`; ctx.beginPath(); ctx.ellipse(e.x, y, g.W0 * b.s * 1.4, g.W0 * b.s * .8, b.h * 3, 0, Math.PI * 2); ctx.fill(); }
  const mid = t => { const e = edgeAt(s, g, t); return [e.x, e.yc + (e.wb - e.wt) / 2 - (singleEdged(s) ? g.W0 * .35 : 0)]; };
  if (tier >= 4 && !s.broken) { ctx.strokeStyle = fam ? "rgba(0,0,0,.35)" : "rgba(40,48,56,.55)"; ctx.lineWidth = g.W0 * .26; ctx.lineCap = "round"; ctx.beginPath(); let first = true;
    for (let i = 0; i <= 30; i++) { const t = .03 + .62 * i / 30; if (t < from || t > to) continue; const [x, y] = mid(t); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; } ctx.stroke(); }
  if (tier >= 6 && !s.broken) { ctx.strokeStyle = fam ? fam.glow : "#c99a4a"; ctx.globalAlpha = .85; ctx.lineWidth = 1.2;
    for (let i = 0; i < 10; i++) { const t = .06 + i * .055; if (t < from || t > to) continue; const [x, y] = mid(t); const r = g.W0 * .2; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, Math.PI * 2.5); ctx.arc(x + r * .9, y, r * .5, Math.PI * .5, Math.PI * 1.8, true); ctx.stroke(); }
    ctx.globalAlpha = 1; }
  if (fam && !s.broken) { ctx.fillStyle = fam.glow; ctx.shadowColor = fam.glow; ctx.shadowBlur = 10; ctx.font = `${Math.round(g.W0 * 1.15)}px ${getComputedStyle(document.documentElement).getPropertyValue("--f-han")}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    [.14, .34].forEach(t => { if (t < from || t > to) return; const [x, y] = mid(t); ctx.fillText(sealCh(fam.han), x, y); }); ctx.shadowBlur = 0; }
  if ((s.cracked || s.grade === 0) && !s.broken && s.crackAt >= from && s.crackAt <= to) { const e = edgeAt(s, g, s.crackAt); const side = singleEdged(s) ? 1 : s.crackSide; let x = e.x, y = side < 0 ? e.yc - e.wt : e.yc + e.wb; ctx.strokeStyle = "rgba(15,8,5,.9)"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); s.crackJag.forEach(j => { x += j * g.W0 * .6; y -= side * g.W0 * .22; ctx.lineTo(x, y); }); ctx.stroke(); }
  if (heat > 2) { const [r, gg, b, a] = heatRGB(heat); ctx.fillStyle = `rgba(${r},${gg},${b},${a})`; ctx.fillRect(0, 0, CW, CH); }
  ctx.restore();
  const gleam = s.broken ? 0 : clamp(s.grade / 5, 0, 1);
  if (gleam > 0) { const { top, bot } = bladePath(s, g, from, to); ctx.save(); ctx.lineWidth = 1.4;
    ctx.strokeStyle = `rgba(255,255,255,${(singleEdged(s) ? .2 : .75) * gleam})`; ctx.beginPath(); top.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${(singleEdged(s) ? .8 : .35) * gleam})`; ctx.beginPath(); bot.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore(); }
  if (heat > 40) { ctx.save(); ctx.shadowColor = "#ff6a10"; ctx.shadowBlur = heat / 3; bladePath(s, g, from, to); ctx.strokeStyle = "rgba(255,140,40,.4)"; ctx.stroke(); ctx.restore(); }
}
function drawTassel(x, y, len, col) {
  const now = performance.now() / 1000; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) { const sw = Math.sin(now * 1.6 + i * .4) * 5 + (i - 4) * 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * .5 - 4, y + len * .5, x + sw - 8, y + len + (i % 3) * 3); ctx.stroke(); }
  ctx.fillStyle = "#c99a4a"; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function drawHilt(s, g) {
  const fam = s.grade >= 10 ? FAMILIES[s.family] : null;
  const x = g.x0, cy = g.cy, W = g.W0, t = s.grade, id = s.kind.id;
  const metal = fam ? (s.family === "dragon" || s.family === "jade" ? "#d9c27a" : fam.c2) : t >= 6 ? "#d9a84a" : t >= 4 ? "#a8803a" : "#4a443d";
  ctx.save();
  if (id === "spear") {
    const sx = 0; ctx.fillStyle = t >= 4 ? "#6b3a1e" : "#4a3626"; ctx.fillRect(sx - 10, cy - W * .32, x - sx + 10, W * .64);
    ctx.strokeStyle = "rgba(0,0,0,.35)"; for (let i = 0; i < x; i += 46) { ctx.beginPath(); ctx.moveTo(i, cy - W * .32); ctx.lineTo(i, cy + W * .32); ctx.stroke(); }
    ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(x - W * 2.4, cy - W * .38); ctx.lineTo(x + W * .2, cy - W * .5); ctx.lineTo(x + W * .2, cy + W * .5); ctx.lineTo(x - W * 2.4, cy + W * .38); ctx.closePath(); ctx.fill();
    drawTassel(x - W * 2.2, cy + W * .3, W * 3, t >= 2 ? "#c8372a" : "#6a3a2a");
    if (t >= 8) { const gem = fam ? fam.gem : "#d0242a"; ctx.shadowColor = gem; ctx.shadowBlur = 12; ctx.fillStyle = gem; ctx.beginPath(); ctx.arc(x - W * .9, cy, W * .25, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return;
  }
  const gripL = W * (id === "zmd" ? 9 : 5) * Math.max(.8, s.kind.len);
  ctx.fillStyle = t < 4 ? "#3b2a1c" : (id === "jian" ? "#2a1e3a" : "#5a2f1a"); ctx.fillRect(x - gripL, cy - W * .42, gripL, W * .84);
  if (t >= 4) { ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1.5; for (let i = 0; i < gripL; i += 6) { ctx.beginPath(); ctx.moveTo(x - gripL + i, cy - W * .42); ctx.lineTo(x - gripL + i + 5, cy + W * .42); ctx.stroke(); } }
  ctx.fillStyle = metal;
  if (id === "jian" || id === "bishou") {
    const gh = W * 2.3; ctx.beginPath(); ctx.moveTo(x - W * .55, cy - gh / 2); ctx.quadraticCurveTo(x, cy - gh / 2 + W * .5, x + W * .35, cy - W * .6); ctx.lineTo(x + W * .35, cy + W * .6); ctx.quadraticCurveTo(x, cy + gh / 2 - W * .5, x - W * .55, cy + gh / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - gripL - W * .9, cy - W * .7); ctx.lineTo(x - gripL + W * .1, cy - W * .5); ctx.lineTo(x - gripL + W * .1, cy + W * .5); ctx.lineTo(x - gripL - W * .9, cy + W * .7); ctx.closePath(); ctx.fill();
    drawTassel(x - gripL - W * .9, cy, W * 3.2, t >= 2 ? "#c8372a" : "#6a3a2a");
  } else {
    ctx.beginPath(); ctx.ellipse(x - W * .1, cy, W * .45, W * 1.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = metal; ctx.lineWidth = W * .32; ctx.beginPath(); ctx.arc(x - gripL - W * .75, cy, W * .7, 0, Math.PI * 2); ctx.stroke();
    if (t >= 2) drawTassel(x - gripL - W * 1.4, cy + W * .3, W * 2.6, "#c8372a");
  }
  if (t >= 8) { const gem = fam ? fam.gem : "#d0242a"; ctx.shadowColor = gem; ctx.shadowBlur = 12; ctx.fillStyle = gem; ctx.beginPath(); ctx.arc(x - W * .1, cy, W * .3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawScene(dt) {
  const now = performance.now() / 1000;
  ctx.save();
  if (shake > 0) { ctx.translate(rnd(-shake, shake), rnd(-shake, shake)); shake = Math.max(0, shake - dt * 40); }
  const bg = ctx.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, "#120d0a"); bg.addColorStop(1, "#1c120c"); ctx.fillStyle = bg; ctx.fillRect(-20, -20, CW + 40, CH + 40);
  // timber and paper-lattice backdrop
  ctx.strokeStyle = "rgba(255,230,200,.04)"; ctx.lineWidth = 1;
  for (let x = 0; x < CW; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH * .7); ctx.stroke(); }
  for (let y = 0; y < CH * .7; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }
  ctx.fillStyle = "rgba(60,30,18,.6)"; ctx.fillRect(0, CH * .7, CW, 6);
  const s = curSword(), ph = S && S.phase;
  if (ph === "furnace") {
    const fx = CW * .5, fw = CW * .9, fy = CH * .22, fh = CH * .7;
    ctx.fillStyle = "#0a0605"; ctx.beginPath(); ctx.moveTo(fx - fw / 2, fy + fh); ctx.lineTo(fx - fw / 2, fy + fh * .35); ctx.quadraticCurveTo(fx, fy - fh * .25, fx + fw / 2, fy + fh * .35); ctx.lineTo(fx + fw / 2, fy + fh); ctx.fill();
    const k = S.furnace.g / 100, fl = .6 + Math.sin(now * 13) * .08 + Math.sin(now * 7.3) * .06;
    const coal = ctx.createRadialGradient(fx, fy + fh, 10, fx, fy + fh, fw * .6); coal.addColorStop(0, `rgba(255,${150 + 80 * k},60,${.5 + .5 * k * fl})`); coal.addColorStop(.5, `rgba(200,50,10,${.35 + .4 * k})`); coal.addColorStop(1, "rgba(60,10,0,0)");
    ctx.fillStyle = coal; ctx.fillRect(0, 0, CW, CH);
    if (S.furnace.holding && Math.random() < .5) sparks(rnd(CW * .2, CW * .8), CH * .95, 2, "#ffcf6a", 200);
  } else {
    const ax = CW * .5, aw = Math.min(CW * .62, 520), ay = CH * .52 + CH * .09;
    ctx.fillStyle = "#26201c"; ctx.beginPath();
    ctx.moveTo(ax - aw * .5, ay); ctx.lineTo(ax + aw * .32, ay); ctx.quadraticCurveTo(ax + aw * .5, ay + 6, ax + aw * .62, ay - 4); ctx.lineTo(ax + aw * .4, ay + CH * .12); ctx.lineTo(ax + aw * .18, ay + CH * .14);
    ctx.lineTo(ax + aw * .2, ay + CH * .3); ctx.lineTo(ax + aw * .32, ay + CH * .4); ctx.lineTo(ax - aw * .32, ay + CH * .4); ctx.lineTo(ax - aw * .2, ay + CH * .3); ctx.lineTo(ax - aw * .22, ay + CH * .14); ctx.lineTo(ax - aw * .5, ay + CH * .1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#4a3f37"; ctx.fillRect(ax - aw * .5, ay, aw * .82, 4);
    if (s && s.state === "heated") { const glow = ctx.createRadialGradient(ax, ay, 4, ax, ay, aw * .6); glow.addColorStop(0, `rgba(255,110,30,${.18 * s.heat / 100})`); glow.addColorStop(1, "rgba(255,110,30,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, CW, CH); }
  }
  if (S && S.safe > 0) { ctx.fillStyle = `rgba(255,${60 + Math.sin(now * 20) * 30},20,${.12 + .06 * Math.sin(now * 25)})`; ctx.fillRect(-20, -20, CW + 40, CH + 40); }
  if (s) {
    const g = geom(s);
    const heat = ph === "furnace" ? S.furnace.g : s.state === "heated" ? s.heat * .9 : 0;
    if (s.broken) {
      const bt = s.breakT || .55, age = Math.min(1, (now - (s.brokeAt || now)) * 2);
      drawHilt(s, g); drawBlade(s, g, 0, bt, 0);
      ctx.save(); const px = g.x0 + bt * g.L, py = g.cy; ctx.translate(px + 18 * age, py + 26 * age); ctx.rotate(.25 * age); ctx.translate(-px, -py); drawBlade(s, g, bt + .01, 1, 0); ctx.restore();
    } else { drawHilt(s, g); drawBlade(s, g, 0, 1, heat); }
    if (s.grade >= 12 && !s.broken && Math.random() < dt * 20) { const fam = FAMILIES[s.family]; const e = edgeAt(s, g, Math.random() * .9); parts.push({ x: e.x, y: e.yc + rnd(-g.W0, g.W0), vx: rnd(-10, 10), vy: rnd(-40, -15), life: 1, max: 1, c: fam.glow, s: rnd(1, 2.5), g: -20 }); }
    if (hammerAnim > 0) { const k = hammerAnim; const hx = g.x0 + hammerX * g.L, hy = g.cy - g.W0 - 4; ctx.save(); ctx.translate(hx + 70, hy); ctx.rotate(-1.2 * k); ctx.fillStyle = "#6b4528"; ctx.fillRect(-4, -100, 8, 100); ctx.fillStyle = "#4a4441"; ctx.fillRect(-82, -24, 40, 30); ctx.fillStyle = "#5e5753"; ctx.fillRect(-82, -24, 40, 6); ctx.fillRect(-46, -16, 46, 12); ctx.restore(); hammerAnim = Math.max(0, hammerAnim - dt * 4); }
  }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.c === "steam") { ctx.fillStyle = `rgba(220,220,230,${.25 * p.life / p.max})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (2 - p.life / p.max), 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = p.c; ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1); ctx.fillRect(p.x, p.y, p.s, p.s); ctx.globalAlpha = 1; } }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t += dt; if (f.t > 1.3) { floats.splice(i, 1); continue; }
    ctx.save(); ctx.globalAlpha = clamp(1.3 - f.t, 0, 1); ctx.fillStyle = f.col; ctx.font = `700 ${f.big ? 46 : 32}px ${getComputedStyle(document.documentElement).getPropertyValue("--f-display")}`; if (ctx.measureText(f.txt).width > CW - 24) ctx.font = `700 ${f.big ? 30 : 24}px ${getComputedStyle(document.documentElement).getPropertyValue("--f-display")}`; ctx.textAlign = "center"; ctx.shadowColor = "#000"; ctx.shadowBlur = 8;
    ctx.fillText(f.txt, CW / 2, CH * .3 - f.t * 30 - i * 4); ctx.restore(); }
  if (flash > 0) { ctx.fillStyle = flashColor; ctx.globalAlpha = flash; ctx.fillRect(-20, -20, CW + 40, CH + 40); ctx.globalAlpha = 1; flash = Math.max(0, flash - dt * 3); }
  ctx.restore();
}

