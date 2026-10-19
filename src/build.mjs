// content/ 의 마크다운을 dist/ 정적 사이트로 변환한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { ogSvg, svgToPng, svgSize } from "./images.mjs";
import { isPublic, publishTime } from "./schedule.mjs";

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
  // 글 주제별 아이콘. 글 머리말에 icon: 이름 으로 지정하고, 없으면 카테고리 아이콘을 쓴다.
  car: '<path d="M4 16v-4l2.2-5.2A1.5 1.5 0 0 1 7.6 6h8.8a1.5 1.5 0 0 1 1.4.8L20 12v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 12h16"/><path d="M7 14.5h1.5M15.5 14.5H17"/><path d="M6 17v2M18 17v2"/>',
  snowflake: [0, 60, 120].map((r) => `<g transform="rotate(${r} 12 12)"><path d="M12 2.5v19"/><path d="M9.8 4.3 12 6.5l2.2-2.2M9.8 19.7 12 17.5l2.2 2.2"/></g>`).join(""),
  bottle: '<path d="M10 2.5h4"/><path d="M10.5 2.5v2.8L9 7.5V20a1.5 1.5 0 0 0 1.5 1.5h3A1.5 1.5 0 0 0 15 20V7.5l-1.5-2.2V2.5"/><path d="M9 11.5h3M9 15h3"/>',
  suitcase: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4.5h6V7"/><path d="M8 7v13M16 7v13"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M10.5 18.5h3"/>',
  jacket: '<path d="M8.5 3 4 5.5 2.5 11.5l3 .8V21h13v-8.7l3-.8L20 5.5 15.5 3a3.5 3.5 0 0 1-7 0z"/><path d="M5.5 13h13M5.5 17h13M12 6.5V21"/>',
  droplet: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M9 14.5a3 3 0 0 0 3 3"/>',
  fridge: '<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M6 9.5h12"/><path d="M9 5.2v1.8M9 12.5v3"/>',
  key: '<circle cx="8" cy="15.5" r="4.5"/><path d="M11.2 12.3 20 3.5"/><path d="M17 6.5l2.5 2.5M14.5 9l2 2"/>',
  truck: '<path d="M2.5 6h11v10h-11z"/><path d="M13.5 9.5h4l3.5 3.5V16h-7.5"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
  flame: '<path d="M12 21.5a7 7 0 0 0 7-7c0-4-3-6.5-4-10-2 1.5-3 3.5-3 5.5-1.5-1-2.5-2-3-3.5-2.5 2-4 5-4 8a7 7 0 0 0 7 7z"/>',
  receipt: '<path d="M5 2.5h14v19l-2.3-1.5-2.4 1.5-2.3-1.5-2.3 1.5-2.4-1.5L5 21.5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
  calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8v3.5H8z"/><path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01"/>',
  shield: '<path d="M12 2.5 4.5 5.5v6c0 4.5 3.2 8.3 7.5 10 4.3-1.7 7.5-5.5 7.5-10v-6z"/><path d="M12 8.5v6M9 11.5h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/><path d="M8 10.5h5M10.5 8v5"/>',
  leaf: '<path d="M5 19C5 11 10 5 20 4c-1 10-7 15-15 15z"/><path d="M5 19l8-8"/>',
  washer: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><circle cx="12" cy="13.5" r="4.5"/><path d="M7.5 6h.01M10.5 6h.01"/>',
  shower: '<path d="M5 21V8a4 4 0 0 1 8 0"/><path d="M9.5 10.5h7"/><path d="M11 14v.01M13 14.5v.01M15 14v.01M12 17.5v.01M14 17.5v.01"/>',
  window: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M4 12h16"/><path d="M7.5 15.5v1.5M16 6.5v1.5"/>',
  liquor: '<path d="M10 2.5h4v3.5l2 3V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20V9l2-3z"/><path d="M8 12.5h8v5H8z"/>',
  bed: '<path d="M3 19V7M3 14.5h18V19M21 14.5v-2a3 3 0 0 0-3-3h-8v5"/><circle cx="6.5" cy="11.5" r="1.5"/>',
  building: '<path d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M2.5 21h19"/><path d="M8 7h3M8 11h3M8 15h3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3"/>',
  coins: '<ellipse cx="9" cy="6.5" rx="5.5" ry="2.5"/><path d="M3.5 6.5v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4"/><path d="M3.5 10.5v2.5c0 1.4 2.5 2.5 5.5 2.5"/><ellipse cx="15" cy="15" rx="5.5" ry="2.5"/><path d="M9.5 15v3.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V15"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M3 12.5h18M11 12.5v2h2v-2"/>',
  swap: '<path d="M4 8h14l-3.5-3.5"/><path d="M20 16H6l3.5 3.5"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
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
const CALC_COLOR = "#0f766e";

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

const postIcon = (p) => (ICONS[p.icon] ? p.icon : catStyle(p.category).icon);

function thumb(p, size = "") {
  const s = catStyle(p.category);
  return `<div class="thumb thumb-v${variant(p.slug)} ${size}" style="--c:${s.color}">
    <span class="thumb-label">${esc(p.category)}</span>
    ${icon(postIcon(p), "thumb-ico")}
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

function layout({ title, description, pathName, body, type = "website", jsonLd, image = "/og-image.png", scripts = [] }) {
  const fullTitle = title ? `${title} | ${config.title}` : `${config.title} - ${config.tagline}`;
  const canonical = siteUrl + pathName;
  const adsense = config.adsenseClient
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsenseClient)}" crossorigin="anonymous"></script>`
    : "";
  // 검색엔진 소유 확인 태그 (site.config.json의 verification에 코드만 넣으면 된다)
  const verify = Object.entries({ "google-site-verification": config.verification?.google, "naver-site-verification": config.verification?.naver })
    .filter(([, v]) => v)
    .map(([k, v]) => `<meta name="${k}" content="${esc(v)}">`)
    .join("\n");
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
<meta name="robots" content="max-image-preview:large">
${verify}
<meta property="og:image" content="${siteUrl}${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e9f6e">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
${scripts.map((s) => `<script type="module" src="${s}"></script>`).join("\n")}
${adsense}
</head>
<body>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="logo" href="/" aria-label="${esc(config.title)} 홈">${LOGO_MARK}<span>${esc(config.title)}</span></a>
    <nav class="gnb" aria-label="카테고리">
      ${categories.map((c) => `<a href="/#${catId(c)}">${esc(c)}</a>`).join("")}
      <a href="/calculators/">계산기</a>
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
// 계산기 스크립트: src/calc/*.js 를 그대로 /calc/ 로 복사한다.
const calcSrc = path.join(root, "src", "calc");
fs.mkdirSync(path.join(dist, "calc"), { recursive: true });
for (const f of fs.readdirSync(calcSrc).filter((f) => f.endsWith(".js"))) fs.copyFileSync(path.join(calcSrc, f), path.join(dist, "calc", f));

const allPosts = readDir("content/posts");
const posts = allPosts
  .filter((p) => isPublic(p))
  .sort((a, b) => b.date.localeCompare(a.date));
for (const p of allPosts) {
  const t = publishTime(p);
  if (t && !isPublic(p)) console.log(`예약 대기: ${p.slug} (${p.publishAt} 공개)`);
}
const pages = readDir("content/pages");
// 계산기: content/calculators/이름.md 는 설명 본문, src/calc/이름.html 은 입력 폼, src/calc/이름.js 는 계산 코드다.
const calcs = readDir("content/calculators")
  .filter((c) => c.draft !== "true")
  .sort((a, b) => Number(a.order || 99) - Number(b.order || 99));
for (const c of calcs) {
  for (const ext of ["html", "js"]) {
    if (!fs.existsSync(path.join(calcSrc, `${c.slug}.${ext}`))) throw new Error(`계산기 파일 없음: src/calc/${c.slug}.${ext}`);
  }
}
// 계산기 글의 {{baseRate}} 같은 자리표시자를 rates.js 값으로 채운다. 기준금리가 자동 반영되면 글도 함께 바뀐다.
{
  const R = await import("./calc/rates.js");
  const capRent = Math.round((2e8 * R.JEONSE_CONVERSION_CAP) / 100 / 12);
  const [by, bm, bd] = R.BASE_RATE.since.split("-").map(Number);
  const tokens = {
    baseRate: `${R.BASE_RATE.rate.toFixed(2)}%`,
    baseRateSince: `${by}년 ${bm}월 ${bd}일`,
    jeonseCap: `${Number.isInteger(R.JEONSE_CONVERSION_CAP) ? R.JEONSE_CONVERSION_CAP.toFixed(1) : R.JEONSE_CONVERSION_CAP}%`,
    capRent: `${capRent.toLocaleString("ko-KR")}원`,
    capRentYear: `${(capRent * 12).toLocaleString("ko-KR")}원`,
  };
  const sub = (s) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in tokens ? tokens[k] : m));
  for (const c of calcs) for (const k of Object.keys(c)) if (typeof c[k] === "string") c[k] = sub(c[k]);
}
const calcBySlug = Object.fromEntries(calcs.map((c) => [c.slug, c]));

// 요율 점검 알림: 마지막 점검일 다음의 1월 1일·7월 1일이 지났거나, 유효기간이 끝난 값이 있으면 경고한다.
// 매일 도는 자동 감시(src/watch.mjs)가 같은 내용을 GitHub 이슈로도 알린다.
const { RATES_CHECKED, VALID_UNTIL } = await import("./calc/rates.js");
{
  const [y, m] = RATES_CHECKED.split("-").map(Number);
  const due = m < 7 ? `${y}-07-01` : `${y + 1}-01-01`;
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  if (today >= due) {
    console.warn(`\n⚠️  계산기 요율 점검 필요: ${due} 이후 아직 점검하지 않았습니다 (마지막 점검 ${RATES_CHECKED}).`);
    console.warn(`    1월: 최저임금·4대보험 요율 / 7월: 국민연금 기준소득월액 상·하한 → src/calc/rates.js 확인 후 RATES_CHECKED 갱신\n`);
  }
  for (const { until, label } of Object.values(VALID_UNTIL)) {
    if (today > until) console.warn(`⚠️  유효기간 지남: ${label} (${until}까지) → 계산기 화면에 "새 기준 확인 중" 안내가 나가는 중`);
  }
}
const categories = [...new Set(posts.map((p) => p.category))];
// "18~20" 같은 범위 표기가 취소선으로 바뀌지 않도록 물결표를 이스케이프한다.
const fill = (s) => s.replace(/~/g, "\\~").replaceAll("{{email}}", config.email).replaceAll("{{title}}", config.title).replaceAll("{{author}}", config.author);
// '보험다모아'**에서 처럼 따옴표·괄호 뒤에 조사가 붙으면 marked가 굵게 처리하지 못해 **가 그대로 남는다.
// 표는 가로 스크롤 상자로 감싼다. 표 자체를 block으로 만들면 내용이 좁을 때 오른쪽이 빈다.
const wrapTables = (html) => html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
const md = (s) => calcCards(figures(wrapTables(marked.parse(fill(s)).replace(/\*\*([^*<>\n]+?)\*\*/g, "<strong>$1</strong>"))));

// 글 본문에 {{calc:이름}} 한 줄을 넣으면 그 계산기로 가는 카드가 들어간다.
function calcCard(c, compact = false) {
  return `<a class="calc-card" href="/calculators/${c.slug}/">${icon(c.icon || "calculator", "calc-card-ico")}<span><b>${esc(compact ? `${c.navTitle || c.title} 계산기` : c.title)}</b><small>${esc(c.short || c.description)}</small></span><em>계산하기</em></a>`;
}
function calcCards(html) {
  return html.replace(/<p>\{\{calc:([\w-]+)\}\}<\/p>/g, (_, slug) => {
    if (!calcBySlug[slug]) throw new Error(`없는 계산기: {{calc:${slug}}}`);
    return calcCard(calcBySlug[slug]);
  });
}

// 본문 설명 그림: content/figures/이름.svg 를 2배 해상도 PNG로 굽고,
// 마크다운에서 ![대체 텍스트](/figures/이름.png "그림 설명") 으로 넣는다.
const figureDir = path.join(root, "content", "figures");
const figureSizes = {};
if (fs.existsSync(figureDir)) {
  fs.mkdirSync(path.join(dist, "figures"), { recursive: true });
  for (const f of fs.readdirSync(figureDir).filter((f) => f.endsWith(".svg"))) {
    const svg = fs.readFileSync(path.join(figureDir, f), "utf8");
    const size = svgSize(svg);
    const name = f.replace(/\.svg$/, ".png");
    figureSizes[name] = size;
    fs.writeFileSync(path.join(dist, "figures", name), svgToPng(svg, size.width * 2));
  }
}
function figures(html) {
  return html.replace(/<p>(<img src="\/figures\/([^"]+)" alt="([^"]*)"(?: title="([^"]*)")?>)<\/p>/g, (_, img, name, alt, caption) => {
    if (!figureSizes[name]) throw new Error(`그림 파일 없음: content/figures/${name.replace(/\.png$/, ".svg")}`);
    const { width, height } = figureSizes[name];
    return `<figure class="fig"><a href="/figures/${name}"><img src="/figures/${name}" alt="${alt}" width="${width}" height="${height}" loading="lazy" decoding="async"></a>${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
  });
}

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
  const { html, toc } = withToc(md(p.body));
  const image = `/thumbs/${p.slug}.png`;
  write(image, svgToPng(ogSvg({
    title: p.title,
    category: p.category,
    color: catStyle(p.category).color,
    iconPaths: ICONS[postIcon(p)],
    siteTitle: config.title,
    tagline: config.tagline,
    seed: variant(p.slug),
  })));
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
    image,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description: p.description,
      image: siteUrl + image,
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
    body: `<article class="post page"><header class="post-head"><div class="wrap narrow"><h1>${esc(p.title)}</h1></div></header><div class="wrap narrow"><div class="content">${md(p.body)}</div></div></article>`,
  }));
}

// 계산기
for (const c of calcs) {
  const form = fs.readFileSync(path.join(calcSrc, `${c.slug}.html`), "utf8");
  const related = (c.related || "").split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => posts.find((p) => p.slug === s)).filter(Boolean);
  const others = calcs.filter((o) => o !== c);
  const { html, toc } = withToc(md(c.body));
  const body = `
<article class="post calc-page">
  <header class="post-head">
    <div class="wrap narrow">
      <a class="chip-link" href="/calculators/"><span class="chip" style="--c:${CALC_COLOR}">계산기</span></a>
      <h1>${esc(c.title)}</h1>
      <p class="dek">${esc(c.description)}</p>
      <p class="meta">${c.basis ? `${esc(c.basis)} · ` : ""}${formatDate(RATES_CHECKED)} 기준 확인</p>
    </div>
  </header>
  <div class="wrap narrow">
    <div class="calc" data-calc="${c.slug}">${form}</div>
    ${toc.length >= 3 ? `<nav class="toc" aria-label="목차"><p class="toc-title">계산 방법과 기준</p><ol>${toc.map((t) => `<li><a href="#${t.id}">${t.html}</a></li>`).join("")}</ol></nav>` : ""}
    <div class="content">${html}</div>
    ${others.length ? `<div class="calc-more"><p class="toc-title">다른 계산기</p>${others.map((o) => calcCard(o, true)).join("")}</div>` : ""}
  </div>
</article>
${related.length ? `<section class="related"><div class="wrap"><h2 class="section-title">함께 보면 좋은 글</h2><div class="grid">${related.map(card).join("")}</div></div></section>` : ""}`;
  write(`calculators/${c.slug}/index.html`, layout({
    title: c.title,
    description: c.description,
    pathName: `/calculators/${c.slug}/`,
    body,
    scripts: [`/calc/${c.slug}.js`],
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: c.title,
      description: c.description,
      url: `${siteUrl}/calculators/${c.slug}/`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "All",
      inLanguage: "ko",
      offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
      publisher: { "@type": "Organization", name: config.title },
    },
  }));
}
if (calcs.length) {
  write("calculators/index.html", layout({
    title: "생활 계산기",
    description: "연봉 실수령액, 퇴직금, 대출이자, 전월세 전환, 중개수수료, 자동차세처럼 자주 찾는 금액을 바로 계산해 보세요. 2026년 요율과 법령 기준을 반영했습니다.",
    pathName: "/calculators/",
    body: `<article class="post page"><header class="post-head"><div class="wrap narrow"><h1>생활 계산기</h1><p class="dek">자주 찾는 금액을 몇 번의 입력으로 계산해 보세요. 요율과 기준은 정부 고시와 법령을 확인해 반영하고, 바뀌면 바로 고칩니다.</p></div></header>
<div class="wrap narrow"><div class="calc-list">${calcs.map(calcCard).join("")}</div>
<p class="calc-note">계산 결과는 참고용입니다. 실제 금액은 회사 급여 규정, 금융회사 약관, 개인 상황에 따라 달라질 수 있습니다.</p></div></article>`,
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
${calcs.length ? `
<section class="home-calcs">
  <div class="wrap">
    <div class="home-calcs-head"><h2 class="section-title">바로 쓰는 계산기</h2><a href="/calculators/">전체 보기</a></div>
    <div class="home-calcs-row">${calcs.map((c) => `<a href="/calculators/${c.slug}/">${icon(c.icon || "calculator")}<span>${esc(c.navTitle || c.title)}</span></a>`).join("")}</div>
  </div>
</section>` : ""}
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
const urls = ["/", ...pages.map((p) => `/${p.slug}/`), ...(calcs.length ? ["/calculators/"] : []), ...calcs.map((c) => `/calculators/${c.slug}/`), ...posts.map((p) => `/posts/${p.slug}/`)];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc></url>`).join("\n")}
</urlset>
`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
if (config.adsenseClient) {
  write("ads.txt", `google.com, ${config.adsenseClient.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);
}

console.log(`빌드 완료: 글 ${posts.length}개, 페이지 ${pages.length}개, 계산기 ${calcs.length}개 → dist/`);
