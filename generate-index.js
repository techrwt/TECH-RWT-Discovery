// generate-index.js
// Ye script data/articles/batch-*.json files ko scan karke
// manifest.json aur articles-index.json khud bana/update kar deta hai.
// Isse GitHub Action chalata hai - manually run karne ki zaroorat nahi.

const fs = require("fs");
const path = require("path");

const ARTICLES_DIR = path.join(__dirname, "data", "articles");
const INDEX_FILE = path.join(__dirname, "data", "articles-index.json");
const MANIFEST_FILE = path.join(ARTICLES_DIR, "manifest.json");

function main() {
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => /^batch-\d+\.json$/.test(f));

  if (files.length === 0) {
    console.log("Koi batch file nahi mili, kuch nahi karna.");
    return;
  }

  let allArticles = [];
  let maxBatch = 0;

  for (const file of files) {
    const batchNum = parseInt(file.match(/^batch-(\d+)\.json$/)[1], 10);
    maxBatch = Math.max(maxBatch, batchNum);

    const content = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8"));
    for (const article of content) {
      const { content: _drop, ...summary } = article;
      summary.batch = batchNum;
      allArticles.push(summary);
    }
  }

  // newest date sabse upar
  allArticles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  fs.writeFileSync(INDEX_FILE, JSON.stringify(allArticles, null, 1), "utf-8");
  fs.writeFileSync(
    MANIFEST_FILE,
    JSON.stringify({ totalBatches: maxBatch, latest: maxBatch }, null, 1),
    "utf-8"
  );

  console.log(`Index update ho gaya: ${allArticles.length} articles, ${maxBatch} batches.`);
}

main();
