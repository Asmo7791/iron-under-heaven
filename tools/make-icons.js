// Renders assets/icon.svg to the PNG sizes the web app, Electron and Android need.
const path = require("path"), fs = require("fs");
let pw; try { pw = require("playwright"); } catch (e) { pw = require("/opt/node-tools/node_modules/playwright"); }
const root = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(root, "assets/icon.svg"), "utf8");
const out = [["web/icons/icon-192.png", 192], ["web/icons/icon-512.png", 512], ["build/icon.png", 1024]];
(async () => {
  const b = await pw.chromium.launch();
  for (const [file, size] of out) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    await p.screenshot({ path: path.join(root, file), omitBackground: true });
    console.log(file, size);
  }
  await b.close();
})();
