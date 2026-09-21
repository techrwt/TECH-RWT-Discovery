// build-site.js
// batch-*.json se: har article ka static page (articles/<slug>.html),
// homepage ke article cards, sitemap.xml aur (agar na ho to) robots.txt banata hai.
// Chalane ka tarika:  node build-site.js

const fs = require("fs");
const os = require("os");
const path = require("path");

const SITE = "https://techrawatdiscovery.sbs";
const INDEXNOW_KEY = "ea815ecda59b4438b6b0a0385443a39c"; // IndexNow key (site par ea815ecda59b4438b6b0a0385443a39c.txt banegi)
const HOME_CARDS = 40; // homepage HTML mein kitne latest cards (Google ke liye)
// "([AGU Newsroom][1])" jaise citation ka kya karna hai:
//   "text"   -> "(AGU Newsroom)" bana do (koi link nahi)
//   "remove" -> poora hata do
const CITATIONS = "text";

const CATEGORY_PAGE = {
  "Science": "pages/science.html",
  "Space & ISRO": "pages/space.html",
  "Technology & Future Tech": "pages/technology.html",
  "Environment": "pages/environment.html",
  "Innovation": "pages/innovation.html",
};
const STATIC_PAGES = [
  "pages/about.html", "pages/contact.html", "pages/science.html", "pages/space.html",
  "pages/technology.html", "pages/environment.html", "pages/innovation.html",
  "pages/privacy.html", "pages/disclaimer.html", "archive.html",
];

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const read = (p) => fs.readFileSync(p, "utf8");

// 1. Saare batch files padho
const batchDir = path.join("data", "articles");
const files = fs.readdirSync(batchDir).filter((f) => /^batch-.*\.json$/.test(f));
let articles = [];
for (const f of files) {
  const list = JSON.parse(read(path.join(batchDir, f)));
  for (const a of list) articles.push(a);
}
const seen = new Set();
articles = articles.filter((a) => a.slug && !seen.has(a.slug) && seen.add(a.slug));
articles.sort((a, b) => String(b.date).localeCompare(String(a.date)));

// content saaf karo: "([AGU Newsroom][1])" jaise adhoore citation ko "(AGU Newsroom)" bana do
const cleanContent = (html) =>
  html.replace(/\s*\(\[([^\]]+)\]\[\d+\]\)/g, CITATIONS === "remove" ? "" : " ($1)");

const trim = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
const imgUrl = (img) => SITE + "/" + encodeURI(img);

// 2. Article pages
const tpl = read("article-template.html");
fs.mkdirSync("articles", { recursive: true });
const newUrls = [];
const newCats = new Set();

for (const a of articles) {
  const url = `${SITE}/articles/${a.slug}.html`;
  const desc = trim(a.searchDescription || a.excerpt, 160);
  const catPage = "/" + (CATEGORY_PAGE[a.category] || "");
  // apne aap: same category ke 4 latest + doosri categories ke 2 (har article ke liye alag-alag, taaki sab jagah links failein)
  const sameCat = articles.filter((r) => r.slug !== a.slug && r.category === a.category).slice(0, 4);
  const others = articles.filter((r) => r.slug !== a.slug && r.category !== a.category);
  const myIdx = articles.indexOf(a);
  const mixed = [];
  for (let i = 0; i < Math.min(2, others.length); i++) mixed.push(others[(myIdx * 2 + i) % others.length]);
  const related = [...sameCat, ...mixed];
  const relatedHtml = related.length
    ? `<section class="related"><h2>और पढ़ें</h2><ul>${related.map((r) => `<li><a href="/articles/${esc(r.slug)}.html">${esc(r.title)}</a></li>`).join("")}</ul></section>`
    : "";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: trim(a.title, 110),
    description: desc,
    image: [imgUrl(a.image)],
    datePublished: a.date,
    dateModified: a.date,
    inLanguage: "hi",
    articleSection: a.category,
    author: { "@type": "Organization", name: a.author || "TECH RWT Discovery", url: SITE + "/" },
    publisher: { "@type": "Organization", name: "TECH RWT Discovery", url: SITE + "/" },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "होम", item: SITE + "/" },
      ...(CATEGORY_PAGE[a.category] ? [{ "@type": "ListItem", position: 2, name: a.category, item: `${SITE}/${CATEGORY_PAGE[a.category]}` }] : []),
      { "@type": "ListItem", position: CATEGORY_PAGE[a.category] ? 3 : 2, name: trim(a.title, 110), item: url },
    ],
  };

  const map = {
    SEO_TITLE: esc(a.seoTitle || a.title),
    IMAGE_CREDIT: a.imageCredit ? `<p class="img-credit">${esc(a.imageCredit)}</p>` : "",
    KEY_POINTS: Array.isArray(a.keyPoints) && a.keyPoints.length
      ? `<div class="key-points"><div class="key-points-title">मुख्य बिंदु</div><ul>${a.keyPoints.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`
      : "",
    TITLE: esc(a.title), DESCRIPTION: esc(desc), URL: url, IMAGE_URL: esc(imgUrl(a.image)),
    IMAGE: esc(encodeURI(a.image)), DATE: esc(a.date), CATEGORY: esc(a.category), CATEGORY_URL: catPage,
    SCHEMA: JSON.stringify([schema, breadcrumb]).replace(/</g, "\\u003c"),
    CONTENT: cleanContent(a.content || ""), RELATED: relatedHtml,
  };
  const out = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in map ? map[k] : ""));
  const outPath = path.join("articles", `${a.slug}.html`);
  const prev = fs.existsSync(outPath) ? read(outPath) : null;
  if (prev !== out || process.env.INDEXNOW_ALL) { newUrls.push(url); newCats.add(a.category); }
  fs.writeFileSync(outPath, out);
}

// 3. Homepage cards
if (fs.existsSync("index.html")) {
  const cards = articles.slice(0, HOME_CARDS).map((a) => {
    const link = `articles/${esc(a.slug)}.html`;
    return `
        <div class="article-card">
          <div class="card-img-wrapper"><img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" onerror="this.src='assets/images/sample-space.jpg'"></div>
          <div class="card-content">
            <div class="card-meta"><span class="card-category">${esc(a.category)}</span><span class="card-date">${esc(a.date)}</span></div>
            <h3 class="card-title"><a href="${link}">${esc(a.title)}</a></h3>
            <p class="card-excerpt">${esc(a.excerpt)}</p>
            <a href="${link}" class="read-more">पूरा लेख पढ़ें &rarr;</a>
          </div>
        </div>`;
  }).join("");
  let home = read("index.html");
  const re = /(<!-- ARTICLES_START -->)[\s\S]*?(<!-- ARTICLES_END -->)/;
  if (re.test(home)) {
    home = home.replace(re, (_, s, e) => `${s}${cards}\n        ${e}`);
    fs.writeFileSync("index.html", home);
  } else {
    console.warn("index.html mein ARTICLES_START / ARTICLES_END markers nahi mile.");
  }
}

// 3b. Category pages (pages/science.html ...) + search.html noindex
const cardHtml = (a) => {
  const link = `/articles/${esc(a.slug)}.html`;
  return `
        <div class="article-card">
          <div class="card-img-wrapper"><img src="/${esc(encodeURI(a.image))}" alt="${esc(a.title)}" loading="lazy" onerror="this.src='/assets/images/sample-space.jpg'"></div>
          <div class="card-content">
            <div class="card-meta"><span class="card-category">${esc(a.category)}</span><span class="card-date">${esc(a.date)}</span></div>
            <h3 class="card-title"><a href="${link}">${esc(a.title)}</a></h3>
            <p class="card-excerpt">${esc(a.excerpt)}</p>
            <a href="${link}" class="read-more">पूरा लेख पढ़ें &rarr;</a>
          </div>
        </div>`;
};
for (const [cat, file] of Object.entries(CATEGORY_PAGE)) {
  if (!fs.existsSync(file)) continue;
  let pg = read(file);
  // purani galat/purani cheezein theek karo (baar baar chalane par bhi safe)
  pg = pg.replace('fetch("../articles.json")', 'fetch("../data/articles-index.json")');
  pg = pg.split('../article.html?slug=${article.slug}').join('../articles/${article.slug}.html');
  // markers na hon to grid ke andar laga do
  if (!pg.includes("<!-- CATEGORY_START -->")) {
    pg = pg.replace(/(<div class="articles-grid" id="categoryArticlesGrid">)[\s\S]*?(<\/div>\s*<\/section>)/,
      "$1\n        <!-- CATEGORY_START -->\n        <!-- CATEGORY_END -->\n      $2");
  }
  const list = articles.filter((a) => a.category === cat).slice(0, 30).map(cardHtml).join("");
  pg = pg.replace(/(<!-- CATEGORY_START -->)[\s\S]*?(<!-- CATEGORY_END -->)/, (_, s, e) => `${s}${list}\n        ${e}`);
  // canonical
  if (!pg.includes('rel="canonical"')) {
    pg = pg.replace(/(<meta name="description"[^>]*>)/, `$1\n  <link rel="canonical" href="${SITE}/${file}">`);
  }
  fs.writeFileSync(file, pg);
}
if (fs.existsSync("pages/search.html")) {
  let s = read("pages/search.html");
  if (!/name="robots"/.test(s)) {
    s = s.replace("</title>", '</title>\n  <meta name="robots" content="noindex, follow">');
    fs.writeFileSync("pages/search.html", s);
  }
}

// 3c. Archive page (archive.html): saare articles ki crawlable list, category ke hisaab se
if (fs.existsSync("archive-template.html")) {
  const sections = Object.entries(CATEGORY_PAGE).map(([cat, file]) => {
    const list = articles.filter((a) => a.category === cat);
    if (!list.length) return "";
    return `<h2><a href="/${file}">${esc(cat)}</a> <span>(${list.length} लेख)</span></h2>\n<ul class="archive-list">` +
      list.map((a) => `<li><a href="/articles/${esc(a.slug)}.html">${esc(a.title)}</a><span class="archive-date">${esc(a.date)}</span></li>`).join("") +
      `</ul>`;
  }).join("\n");
  const archiveSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "सभी लेख (Archive) - TECH RWT Discovery",
    url: SITE + "/archive.html",
    inLanguage: "hi",
    isPartOf: { "@type": "WebSite", name: "TECH RWT Discovery", url: SITE + "/" },
  };
  const archiveMap = { COUNT: String(articles.length), CONTENT: sections, SCHEMA: JSON.stringify(archiveSchema).replace(/</g, "\\u003c") };
  fs.writeFileSync("archive.html", read("archive-template.html").replace(/\{\{(\w+)\}\}/g, (_, k) => (k in archiveMap ? archiveMap[k] : "")));
}

// 4. sitemap.xml
const urls = [{ loc: SITE + "/" }];
for (const p of STATIC_PAGES) if (fs.existsSync(p)) urls.push({ loc: `${SITE}/${p}` });
for (const a of articles) urls.push({ loc: `${SITE}/articles/${a.slug}.html`, lastmod: a.date });
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ""}</url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync("sitemap.xml", sitemap);

// 4a. RSS feed (feed.xml): latest 30 articles
const rfc822 = (d) => { const t = new Date(d); return isNaN(t) ? new Date().toUTCString() : t.toUTCString(); };
const feedItems = articles.slice(0, 30).map((a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${SITE}/articles/${esc(a.slug)}.html</link>
      <guid isPermaLink="true">${SITE}/articles/${esc(a.slug)}.html</guid>
      <pubDate>${rfc822(a.date)}</pubDate>
      <category>${esc(a.category)}</category>
      <description>${esc(trim(a.searchDescription || a.excerpt, 300))}</description>
    </item>`).join("\n");
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TECH RWT Discovery</title>
    <link>${SITE}/</link>
    <description>विज्ञान और भविष्य की तकनीक - Science, Space &amp; ISRO, Technology, Environment और Innovation की खबरें आसान Hindi में।</description>
    <language>hi</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${feedItems}
  </channel>
</rss>
`;
fs.writeFileSync("feed.xml", feed);

// 4b. IndexNow: key file + naye URLs ki list (indexnow.js ise Bing ko bhejta hai)
if (!fs.existsSync(`${INDEXNOW_KEY}.txt`)) fs.writeFileSync(`${INDEXNOW_KEY}.txt`, INDEXNOW_KEY);
const submit = [];
if (newUrls.length) {
  submit.push(...newUrls, SITE + "/", SITE + "/archive.html");
  for (const c of newCats) if (CATEGORY_PAGE[c]) submit.push(`${SITE}/${CATEGORY_PAGE[c]}`);
}
fs.writeFileSync(path.join(os.tmpdir(), "indexnow-urls.json"),
  JSON.stringify({ host: new URL(SITE).host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: submit }));

// 5. robots.txt (sirf tab banega jab pehle se na ho)
if (!fs.existsSync("robots.txt")) {
  fs.writeFileSync("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
}

console.log(`Done: ${articles.length} article pages, sitemap with ${urls.length} URLs.`);
