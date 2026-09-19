// indexnow.js - naye URLs Bing/Yandex ko IndexNow se bhejta hai.
// build-site.js ke baad chalta hai. Chalane ka tarika: node indexnow.js
const fs = require("fs");
const os = require("os");
const path = require("path");

const file = path.join(os.tmpdir(), "indexnow-urls.json");
if (!fs.existsSync(file)) { console.log("Koi list nahi mili."); process.exit(0); }
const payload = JSON.parse(fs.readFileSync(file, "utf8"));
if (!payload.urlList.length) { console.log("Koi naya URL nahi, IndexNow skip."); process.exit(0); }

console.log(`IndexNow: ${payload.urlList.length} URLs bhej raha hoon...`);
payload.urlList.forEach((u) => console.log(" -", u));
if (process.env.DRY_RUN) process.exit(0);

fetch("https://api.indexnow.org/IndexNow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
}).then((r) => {
  console.log("IndexNow response:", r.status);
  process.exit(r.status === 200 || r.status === 202 ? 0 : 1);
}).catch((e) => { console.error(e); process.exit(1); });
