/* Each language file calls IUH_LANG(code, tree). Nested keys flatten to "a.b.c"; "_" names the node itself. */
window.IUH_I18N = window.IUH_I18N || {};
window.IUH_LANG = function (code, tree) {
  const out = {}, keep = { defaults: 1, seals: 1 };
  (function walk(o, pre) {
    for (const k in o) {
      const v = o[k], key = k === "_" ? pre : pre ? pre + "." + k : k;
      if (v && typeof v === "object" && !Array.isArray(v) && !keep[k]) walk(v, key); else out[key] = v;
    }
  })(tree, "");
  window.IUH_I18N[code] = out;
};
