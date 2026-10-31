// Checks every language against English: same keys, same {placeholders}, same array lengths,
// and that every literal key the game asks for exists in English.
const fs = require("fs"), path = require("path"), vm = require("vm");
const src = path.join(__dirname, "..", "src");
const ctx = { window: {} }; ctx.IUH_LANG = null; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(src, "lang/_base.js"), "utf8").replace(/window\./g, "this.") + ";IUH_LANG=this.IUH_LANG;", ctx);
const langs = ["en", "zh-Hans", "zh-Hant", "ja", "es", "fr"];
for (const l of langs) vm.runInContext(fs.readFileSync(path.join(src, `lang/${l}.js`), "utf8"), ctx);
const D = ctx.IUH_I18N, en = D.en; let bad = 0;
const ph = v => typeof v === "string" ? [...new Set(v.match(/\{\w+\}/g) || [])].sort().join() : "";
const sample = v => typeof v === "function" ? "fn" : Array.isArray(v) ? "arr" + v.length : typeof v;
for (const l of langs.slice(1)) {
  const d = D[l];
  for (const k of Object.keys(en)) {
    if (d[k] === undefined) { if (!k.endsWith(".pl") && !/\.seal$/.test(k)) { console.log(`${l}: missing ${k}`); bad++; } continue; }
    const norm = s => s === "fn" ? "string" : s; if (norm(sample(d[k])) !== norm(sample(en[k])) && k !== "seals") { console.log(`${l}: type ${k} ${sample(d[k])} vs ${sample(en[k])}`); bad++; }
    const base = k.replace(/\.pl$/, "");
    if (typeof en[k] === "string" && ph(d[k]) !== ph(en[k]) && ph(d[k]) !== ph(en[base])) { console.log(`${l}: placeholders ${k} [${ph(d[k])}] vs [${ph(en[k])}]`); bad++; }
  }
  for (const k of Object.keys(d)) if (en[k] === undefined) { console.log(`${l}: extra ${k}`); bad++; }
}
const code = ["game.js"].map(f => fs.readFileSync(path.join(src, f), "utf8")).join("\n") + fs.readFileSync(path.join(src, "body.html"), "utf8");
const used = new Set([...code.matchAll(/\b(?:t|tn|raw|setNote|setPatron|pk)\("([\w.]+)"/g)].map(m => m[1]).concat([...code.matchAll(/data-i18n(?:-html)?="([\w.]+)"/g)].map(m => m[1])));
for (const k of used) if (en[k] === undefined && k !== "stage" && !k.endsWith(".")) { console.log(`en: missing used key ${k}`); bad++; }
console.log(bad ? `${bad} problems` : `ok: ${Object.keys(en).length} English keys, ${langs.length} languages`);
process.exit(bad ? 1 : 0);
