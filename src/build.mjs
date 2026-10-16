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
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;900&display=swap">
<link rel="stylesheet" href="/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
${adsense}
</head>
<body>
<header class="masthead">
  <div class="wrap">
    <a class="logo" href="/">
      <svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="4.5" fill="currentColor"/></svg>
      <span>${esc(config.title)}</span>
    </a>
    <p class="tagline">${esc(config.tagline)}</p>
  </div>
  <nav class="sections">
    <div class="wrap">
      <a href="/">전체</a>
      ${categories.map((c) => `<a href="/#${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}
      <a href="/about/">소개</a>
    </div>
  </nav>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <nav>
      <a href="/about/">소개</a>
      <a href="/contact/">문의</a>
      <a href="/privacy/">개인정보처리방침</a>
      <a href="/disclaimer/">면책 고지</a>
    </nav>
    <p>© ${new Date().getFullYear()} ${esc(config.title)}. All rights reserved.</p>
  </div>
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
for (const f of ["style.css", "favicon.svg"]) fs.copyFileSync(path.join(root, "src", f), path.join(dist, f));

const posts = readDir("content/posts")
  .filter((p) => p.draft !== "true")
  .sort((a, b) => b.date.localeCompare(a.date));
const pages = readDir("content/pages");
const categories = [...new Set(posts.map((p) => p.category))];
// "18~20" 같은 범위 표기가 취소선으로 바뀌지 않도록 물결표를 이스케이프한다.
const fill = (s) => s.replace(/~/g, "\\~").replaceAll("{{email}}", config.email).replaceAll("{{title}}", config.title).replaceAll("{{author}}", config.author);

// 글
for (const [i, p] of posts.entries()) {
  const prev = posts[i + 1];
  const next = posts[i - 1];
  const related = posts.filter((o) => o !== p && o.category === p.category).slice(0, 3);
  const body = `
<article class="post">
  <p class="meta"><span class="cat">${esc(p.category)}</span> · <time datetime="${p.date}">${formatDate(p.date)}</time>${p.updated ? ` · 수정 ${formatDate(p.updated)}` : ""}</p>
  <h1>${esc(p.title)}</h1>
  <div class="content">${marked.parse(fill(p.body))}</div>
  <p class="byline">글: ${esc(config.author)}</p>
</article>
${related.length ? `<section class="related"><h2>같은 주제의 글</h2><ul>${related.map((r) => `<li><a href="/posts/${r.slug}/">${esc(r.title)}</a></li>`).join("")}</ul></section>` : ""}
<nav class="pager">
  ${prev ? `<a href="/posts/${prev.slug}/">← ${esc(prev.title)}</a>` : "<span></span>"}
  ${next ? `<a href="/posts/${next.slug}/">${esc(next.title)} →</a>` : "<span></span>"}
</nav>`;
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
    body: `<article class="post page"><h1>${esc(p.title)}</h1><div class="content">${marked.parse(fill(p.body))}</div></article>`,
  }));
}

// 홈
write("index.html", layout({
  pathName: "/",
  body: `
<h1 class="sr-only">${esc(config.title)} - ${esc(config.tagline)}</h1>
${posts[0] ? `
<section class="lead">
  <a href="/posts/${posts[0].slug}/">
    <p class="kicker">${esc(posts[0].category)}</p>
    <h2>${esc(posts[0].title)}</h2>
    <p class="dek">${esc(posts[0].description)}</p>
    <time datetime="${posts[0].date}">${formatDate(posts[0].date)}</time>
  </a>
</section>` : ""}
${categories.map((c) => `
<section class="cat-section" id="${esc(c)}">
  <h2>${esc(c)}</h2>
  <ul class="post-list">
  ${posts.filter((p) => p.category === c && p !== posts[0]).map((p) => `
    <li>
      <a href="/posts/${p.slug}/">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
        <time datetime="${p.date}">${formatDate(p.date)}</time>
      </a>
    </li>`).join("")}
  </ul>
</section>`).join("")}`,
}));

// 404
write("404.html", layout({
  title: "페이지를 찾을 수 없습니다",
  pathName: "/404.html",
  body: `<article class="post page"><h1>페이지를 찾을 수 없습니다</h1><p>주소가 바뀌었거나 삭제된 글입니다. <a href="/">홈으로 돌아가기</a></p></article>`,
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
