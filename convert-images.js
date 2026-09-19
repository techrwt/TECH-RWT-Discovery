// convert-images.js - assets/images ki har .png/.jpg/.jpeg ki .webp copy banata hai.
// Original file waisi hi rehti hai. Jinki .webp pehle se hai unhe dobara nahi banata.
// Chalane ka tarika: node convert-images.js   (sharp library chahiye)
const fs = require("fs");
const path = require("path");

let sharp;
try { sharp = require("sharp"); } catch (e) { console.error("sharp install nahi hai."); process.exit(1); }

const DIR = "assets/images";
const MAX_WIDTH = 1200;
const QUALITY = 85;
const SKIP = /^(favicon|logo|line|sample)/i; // site ke design wali images ko haath nahi lagate

(async () => {
  if (!fs.existsSync(DIR)) { console.log("assets/images nahi mila."); return; }
  const files = fs.readdirSync(DIR).filter((f) => /\.(png|jpe?g)$/i.test(f) && !SKIP.test(f));
  let made = 0;
  for (const f of files) {
    const out = path.join(DIR, f.replace(/\.(png|jpe?g)$/i, ".webp"));
    if (fs.existsSync(out)) continue;
    try {
      await sharp(path.join(DIR, f)).rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY }).toFile(out);
      made++;
      console.log("webp bani:", f);
    } catch (e) { console.warn("chhoda:", f, e.message); }
  }
  console.log(`Done: ${made} nayi webp images.`);
})();
