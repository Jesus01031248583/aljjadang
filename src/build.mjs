// content/ 의 마크다운을 dist/ 정적 사이트로 변환한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
const dist = path.join(root, "dist");
const siteUrl = config.url.replace(/\/$/, "");

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 카테고리별 색과 아이콘. 새 카테고리는 여기에 추가하고, 없으면 기본값을 쓴다.
const ICONS = {
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3h-4a2 2 0 0 0 0 4h4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/>',
  sparkle: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  box: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/><path d="M9.5 20v-6h5v6"/>',
  glass: '<path d="M8 3h8l-.4 6a3.6 3.6 0 0 1-7.2 0z"/><path d="M12 12.6V21"/><path d="M8.5 21h7"/>',
  won: '<circle cx="12" cy="12" r="9"/><path d="M7.5 8l2 8 2.5-6 2.5 6 2-8"/><path d="M6.5 11.5h11"/>',
  doc: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
};
const CATEGORY_STYLE = {
  "절약": { color: "#0e9f6e", icon: "wallet" },
  "청소·관리": { color: "#0284c7", icon: "sparkle" },
  "정리·수납": { color: "#d97706", icon: "box" },
  "생활 준비": { color: "#7c3aed", icon: "home" },
  "음식·문화": { color: "#e11d48", icon: "glass" },
  "세금·금융": { color: "#4338ca", icon: "won" },
};
const catStyle = (c) => CATEGORY_STYLE[c] || { color: "#475569", icon: "doc" };
const icon = (name, cls = "ico") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const catId = (c) => `cat-${categories.indexOf(c) + 1}`;

const LOGO_MARK = `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="currentColor"/><path d="M9.5 16.5l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function parseMarkdown(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`frontmatter 없음: ${file}`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  meta.slug = path.basename(file, ".md");
  meta.body = m[2];
  return meta;
}

function readDir(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".md")).map((f) => parseMarkdown(path.join(full, f)));
}

function formatDate(d) {
  const [y, mo, da] = d.split("-");
  return `${y}년 ${Number(mo)}월 ${Number(da)}일`;
}
const shortDate = (d) => d.replaceAll("-", ".");
const readMinutes = (body) => Math.max(1, Math.round(body.replace(/\s+/g, "").length / 500));

// 같은 카테고리 카드끼리도 썸네일 무늬가 조금씩 다르도록 slug로 변주를 정한다.
const variant = (slug) => [...slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 4;

function thumb(p, size = "") {
  const s = catStyle(p.category);
  return `<div class="thumb thumb-v${variant(p.slug)} ${size}" style="--c:${s.color}">
    <span class="thumb-label">${esc(p.category)}</span>
    ${icon(s.icon, "thumb-ico")}
  </div>`;
}

function chip(c) {
  return `<span class="chip" style="--c:${catStyle(c).color}">${esc(c)}</span>`;
}

function card(p) {
  return `<a class="card" href="/posts/${p.slug}/">
  ${thumb(p)}
  <div class="card-body">
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.description)}</p>
    <span class="card-meta"><time datetime="${p.date}">${shortDate(p.date)}</time> · ${readMinutes(p.body)}분 읽기</span>
  </div>
</a>`;
}

function layout({ title, description, pathName, body, type = "website", jsonLd }) {
  const fullTitle = title ? `${title} | ${config.title}` : `${config.title} - ${config.tagline}`;
  const canonical = siteUrl + pathName;
  const adsense = config.adsenseClient
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsenseClient)}" crossorigin="anonymous"></script>`
    : "";
  return `<!doctype html>
<html lang="${config.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || config.description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || config.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="${esc(config.title)}">
<meta property="og:image" content="${siteUrl}/og-image.png?v=2">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e9f6e">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
${adsense}
</head>
<body>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="logo" href="/" aria-label="${esc(config.title)} 홈">${LOGO_MARK}<span>${esc(config.title)}</span></a>
    <nav class="gnb" aria-label="카테고리">
      ${categories.map((c) => `<a href="/#${catId(c)}">${esc(c)}</a>`).join("")}
      <a href="/about/">소개</a>
    </nav>
  </div>
</header>
<main>
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div class="footer-brand">
      <a class="logo" href="/">${LOGO_MARK}<span>${esc(config.title)}</span></a>
      <p>${esc(config.description)}</p>
    </div>
    <nav class="footer-links" aria-label="사이트 정보">
      <a href="/about/">소개</a>
      <a href="/contact/">문의</a>
      <a href="/privacy/">개인정보처리방침</a>
      <a href="/disclaimer/">면책 고지</a>
    </nav>
  </div>
  <div class="wrap"><p class="copyright">© ${new Date().getFullYear()} ${esc(config.title)}. All rights reserved.</p></div>
</footer>
</body>
</html>
`;
}

function write(rel, content) {
  const out = path.join(dist, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
}

// 준비
// 폴더 자체는 두고 내용만 비운다 (미리보기 서버·OneDrive가 폴더를 잡고 있어도 동작하도록).
fs.mkdirSync(dist, { recursive: true });
for (const f of fs.readdirSync(dist)) fs.rmSync(path.join(dist, f), { recursive: true, force: true });
for (const f of ["style.css", "favicon.svg", "og-image.png"]) fs.copyFileSync(path.join(root, "src", f), path.join(dist, f));

const posts = readDir("content/posts")
  .filter((p) => p.draft !== "true")
  .sort((a, b) => b.date.localeCompare(a.date));
const pages = readDir("content/pages");
const categories = [...new Set(posts.map((p) => p.category))];
// "18~20" 같은 범위 표기가 취소선으로 바뀌지 않도록 물결표를 이스케이프한다.
const fill = (s) => s.replace(/~/g, "\\~").replaceAll("{{email}}", config.email).replaceAll("{{title}}", config.title).replaceAll("{{author}}", config.author);

// 본문 h2에 id를 달고 목차 항목을 모은다.
function withToc(html) {
  const toc = [];
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
    const id = `sec-${toc.length + 1}`;
    // inner is already HTML-escaped by marked; keep it as HTML, only drop tags.
    // 목차 <ol>이 번호를 자동으로 붙이므로 제목 앞의 "1. " 같은 번호는 뗀다.
    toc.push({ id, html: inner.replace(/<[^>]+>/g, "").replace(/^\s*\d+\.\s*/, "") });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

// 글
for (const [i, p] of posts.entries()) {
  const prev = posts[i + 1];
  const next = posts[i - 1];
  const sameCat = posts.filter((o) => o !== p && o.category === p.category);
  const related = [...sameCat, ...posts.filter((o) => o !== p && o.category !== p.category)].slice(0, 3);
  const { html, toc } = withToc(marked.parse(fill(p.body)));
  const body = `
<article class="post">
  <header class="post-head">
    <div class="wrap narrow">
      <a class="chip-link" href="/#${catId(p.category)}">${chip(p.category)}</a>
      <h1>${esc(p.title)}</h1>
      <p class="dek">${esc(p.description)}</p>
      <p class="meta"><time datetime="${p.date}">${formatDate(p.date)}</time>${p.updated ? ` · 수정 ${formatDate(p.updated)}` : ""} · ${readMinutes(p.body)}분 읽기</p>
    </div>
  </header>
  <div class="wrap narrow">
    ${toc.length >= 3 ? `<nav class="toc" aria-label="목차"><p class="toc-title">이 글의 순서</p><ol>${toc.map((t) => `<li><a href="#${t.id}">${t.html}</a></li>`).join("")}</ol></nav>` : ""}
    <div class="content">${html}</div>
    <div class="byline">
      ${LOGO_MARK}
      <div><strong>${esc(config.author)}</strong><span>꼼꼼히 확인한 생활 정보 중 알짜만 골라 전합니다.</span></div>
    </div>
    <nav class="pager" aria-label="이전·다음 글">
      ${prev ? `<a href="/posts/${prev.slug}/"><span>이전 글</span>${esc(prev.title)}</a>` : "<span></span>"}
      ${next ? `<a class="next" href="/posts/${next.slug}/"><span>다음 글</span>${esc(next.title)}</a>` : "<span></span>"}
    </nav>
  </div>
</article>
${related.length ? `<section class="related"><div class="wrap"><h2 class="section-title">${sameCat.length ? "함께 보면 좋은 글" : "다른 알짜 정보"}</h2><div class="grid">${related.map(card).join("")}</div></div></section>` : ""}`;
  write(`posts/${p.slug}/index.html`, layout({
    title: p.title,
    description: p.description,
    pathName: `/posts/${p.slug}/`,
    type: "article",
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      dateModified: p.updated || p.date,
      author: { "@type": "Person", name: config.author },
      publisher: { "@type": "Organization", name: config.title },
    },
  }));
}

// 고정 페이지
for (const p of pages) {
  write(`${p.slug}/index.html`, layout({
    title: p.title,
    description: p.description,
    pathName: `/${p.slug}/`,
    body: `<article class="post page"><header class="post-head"><div class="wrap narrow"><h1>${esc(p.title)}</h1></div></header><div class="wrap narrow"><div class="content">${marked.parse(fill(p.body))}</div></div></article>`,
  }));
}

// 홈
const [featured, ...rest] = posts;
write("index.html", layout({
  pathName: "/",
  body: `
<h1 class="sr-only">${esc(config.title)} - ${esc(config.tagline)}</h1>
<section class="intro">
  <div class="wrap">
    <p class="intro-eyebrow">${esc(config.tagline)}</p>
    <p class="intro-title">살림의 돈·시간·수고를 줄이는<br>생활 정보만 모았어요</p>
    <div class="cat-pills">
      ${categories.map((c) => `<a href="#${catId(c)}" style="--c:${catStyle(c).color}">${icon(catStyle(c).icon)}${esc(c)}<b>${posts.filter((p) => p.category === c).length}</b></a>`).join("")}
    </div>
  </div>
</section>
${featured ? `
<section class="hero">
  <div class="wrap hero-grid">
    <a class="feature" href="/posts/${featured.slug}/">
      ${thumb(featured, "thumb-lg")}
      <div class="feature-body">
        <span class="badge">새로 올라온 글</span>
        <h2>${esc(featured.title)}</h2>
        <p>${esc(featured.description)}</p>
        <span class="card-meta"><time datetime="${featured.date}">${shortDate(featured.date)}</time> · ${readMinutes(featured.body)}분 읽기</span>
      </div>
    </a>
    <div class="latest">
      <p class="latest-title">최신 글</p>
      <ol>
      ${rest.slice(0, 5).map((p, n) => `<li><a href="/posts/${p.slug}/"><span class="num">${n + 1}</span><span><em style="--c:${catStyle(p.category).color}">${esc(p.category)}</em>${esc(p.title)}</span></a></li>`).join("")}
      </ol>
    </div>
  </div>
</section>` : ""}
<section class="all-posts" id="posts">
  <div class="wrap">
    <h2 class="section-title">전체 글<small id="post-count"></small></h2>
    <div class="tabs" role="tablist">
      <a href="#posts" class="is-active" data-cat="">전체</a>
      ${categories.map((c) => `<a href="#${catId(c)}" data-cat="${catId(c)}">${esc(c)}</a>`).join("")}
    </div>
    <div class="grid">${posts.map((p) => card(p).replace('<a class="card"', `<a class="card${p === featured ? " is-featured" : ""}" data-cat="${catId(p.category)}"`)).join("")}</div>
  </div>
</section>
<script>
(() => {
  const cards = document.querySelectorAll(".all-posts .card");
  const tabs = document.querySelectorAll(".tabs a");
  const count = document.getElementById("post-count");
  const apply = (scroll) => {
    const id = location.hash.startsWith("#cat-") ? location.hash.slice(1) : "";
    let n = 0;
    cards.forEach((c) => { const show = id ? c.dataset.cat === id : !c.classList.contains("is-featured"); c.hidden = !show; if (show) n++; });
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.cat === id));
    count.textContent = n + "개의 글";
    if (scroll && id) document.getElementById("posts").scrollIntoView({ behavior: "smooth" });
  };
  addEventListener("hashchange", () => apply(true));
  apply(true);
})();
</script>`,
}));

// 404
write("404.html", layout({
  title: "페이지를 찾을 수 없습니다",
  pathName: "/404.html",
  body: `<article class="post page"><header class="post-head"><div class="wrap narrow"><h1>페이지를 찾을 수 없습니다</h1><p class="dek">주소가 바뀌었거나 삭제된 글입니다. <a href="/">홈으로 돌아가기</a></p></div></header></article>`,
}));

// sitemap, robots, ads.txt
const urls = ["/", ...pages.map((p) => `/${p.slug}/`), ...posts.map((p) => `/posts/${p.slug}/`)];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc></url>`).join("\n")}
</urlset>
`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
if (config.adsenseClient) {
  write("ads.txt", `google.com, ${config.adsenseClient.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);
}

console.log(`빌드 완료: 글 ${posts.length}개, 페이지 ${pages.length}개 → dist/`);
