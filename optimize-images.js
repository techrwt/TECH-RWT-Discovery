// optimize-images.js
// Chalane se pehle (ek baar):  npm install sharp
// Chalao (site ke root folder se):  node optimize-images.js
// Ye karta hai:
//  1. Line.png (hero) -> Line.webp + Line-640.webp, "Logo line.png" -> logo-line.webp
//  2. index.html ke hero/logo/preload tags apne aap sahi width/height ke saath badal deta hai
//  3. assets/images ki badi .webp images ko chhota karta hai (naam wahi rehta hai)
// Original PNG files delete nahi hoti. Chalane se pehle git commit kar lo.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DIR = path.join("assets", "images");
const kb = (n) => Math.round(n / 1024) + " KB";

async function toWebp(srcName, outName, width, quality) {
  const src = path.join(DIR, srcName);
  if (!fs.existsSync(src)) { console.log("NAHI MILA:", src); return null; }
  const meta = await sharp(src).metadata();
  const w = Math.min(meta.width, width);
  const info = await sharp(src).resize({ width: w }).webp({ quality }).toFile(path.join(DIR, outName));
  console.log(`${srcName} (${kb(fs.statSync(src).size)}, ${meta.width}x${meta.height}) -> ${outName} (${kb(info.size)}, ${info.width}x${info.height})`);
  return info;
}

const swap = (html, name, content) =>
  html.replace(new RegExp(`(<!-- ${name}_START -->)[\\s\\S]*?(<!-- ${name}_END -->)`), (m, s, e) => `${s}\n${content}\n${e}`);

(async () => {
  // 1. hero + logo
  const hero = await toWebp("Line.png", "Line.webp", 1200, 80);
  const hero640 = await toWebp("Line.png", "Line-640.webp", 640, 80);
  const logo = await toWebp("Logo line.png", "logo-line.webp", 460, 85);

  // 2. index.html patch
  if (fs.existsSync("index.html")) {
    let html = fs.readFileSync("index.html", "utf8");
    if (hero && hero640) {
      const sizes = "(max-width: 1240px) calc(100vw - 40px), 1160px";
      const srcset = `assets/images/Line-640.webp ${hero640.width}w, assets/images/Line.webp ${hero.width}w`;
      html = swap(html, "HERO_PRELOAD",
        `  <link rel="preload" as="image" href="assets/images/Line.webp" imagesrcset="${srcset}" imagesizes="${sizes}" fetchpriority="high">`);
      html = swap(html, "HERO_IMG",
        `      <img src="assets/images/Line.webp" srcset="${srcset}" sizes="${sizes}" width="${hero.width}" height="${hero.height}" alt="Science, Space, Technology, Environment और Innovation categories" fetchpriority="high" decoding="async">`);
    }
    if (logo) {
      html = swap(html, "LOGO_IMG",
        `          <img src="assets/images/logo-line.webp" width="${logo.width}" height="${logo.height}" alt="TECH RWT Discovery Logo" decoding="async">`);
    }
    fs.writeFileSync("index.html", html);
    console.log("index.html update ho gaya.");
  }

  // 3. baaki badi webp images
  let before = 0, after = 0, changed = 0;
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith(".webp") || /^(Line|logo-line)/i.test(f)) continue;
    const p = path.join(DIR, f);
    const size = fs.statSync(p).size;
    const meta = await sharp(p).metadata();
    if (size < 150 * 1024 && meta.width <= 1280) continue;
    const buf = await sharp(p).resize({ width: Math.min(meta.width, 1280) }).webp({ quality: 75 }).toBuffer();
    if (buf.length < size) {
      fs.writeFileSync(p, buf);
      before += size; after += buf.length; changed++;
    }
  }
  console.log(`Badi images: ${changed} chhoti ki gayin, ${kb(before)} -> ${kb(after)}`);
})();
