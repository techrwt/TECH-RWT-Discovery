/* ==========================================
   TECH RWT Discovery - Main JavaScript
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Dark / Light Mode Toggle
  const themeToggle = document.getElementById("themeToggle");
  const currentTheme = localStorage.getItem("theme") || "light";

  if (currentTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (themeToggle) themeToggle.innerHTML = "☀️";
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    if (themeToggle) themeToggle.innerHTML = "🌙";
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      let theme = document.documentElement.getAttribute("data-theme");
      if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
        themeToggle.innerHTML = "🌙";
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
        themeToggle.innerHTML = "☀️";
      }
    });
  }

  // 2. Mobile Navigation Menu Toggle
  const hamburger = document.getElementById("hamburgerBtn");
  const navLinks = document.getElementById("navLinks");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // 3. Load Articles on Homepage
  const articlesGrid = document.getElementById("articlesGrid");
  if (articlesGrid) {
    fetchArticles();
  }
});

// Fetch and Render Articles Function
async function fetchArticles(selectedCategory = "All") {
  const articlesGrid = document.getElementById("articlesGrid");
  if (!articlesGrid) return;

  articlesGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--text-muted);'>लोड हो रहा है...</p>";

  try {
    const response = await fetch("articles.json");
    if (!response.ok) throw new Error("Articles load karne mein samasya aayi.");
    const articles = await response.json();

    let filteredArticles = articles;
    if (selectedCategory !== "All") {
      filteredArticles = articles.filter(article => article.category === selectedCategory);
    }

    if (filteredArticles.length === 0) {
      articlesGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;'>इस श्रेणी में अभी कोई लेख उपलब्ध नहीं है।</p>";
      return;
    }

    articlesGrid.innerHTML = "";
    filteredArticles.forEach(article => {
      const card = document.createElement("div");
      card.className = "article-card";
      card.innerHTML = `
        <div class="card-img-wrapper">
          <img src="${article.image}" alt="${article.title}" onerror="this.src='assets/images/sample-space.jpg'">
        </div>
        <div class="card-content">
          <div class="card-meta">
            <span class="card-category">${article.category}</span>
            <span class="card-date">${article.date}</span>
          </div>
          <h3 class="card-title">
            <a href="article.html?slug=${article.slug}">${article.title}</a>
          </h3>
          <p class="card-excerpt">${article.excerpt}</p>
          <a href="article.html?slug=${article.slug}" class="read-more">पूरा लेख पढ़ें &rarr;</a>
        </div>
      `;
      articlesGrid.appendChild(card);
    });

  } catch (error) {
    console.error("Error:", error);
    articlesGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: red;'>लेख लोड करने में विफल। कृपया पुनः प्रयास करें।</p>";
  }
}

// Category Filter Function for Homepage
function filterCategory(category, btnElement) {
  const buttons = document.querySelectorAll(".cat-btn");
  buttons.forEach(btn => btn.classList.remove("active"));
  if (btnElement) {
    btnElement.classList.add("active");
  }
  fetchArticles(category);
}
