// 글별 대표 이미지(og 썸네일)와 본문 설명 그림을 PNG로 만든다.
// 글꼴은 src/fonts의 Pretendard(OFL)만 써서 어느 컴퓨터에서 빌드해도 같은 결과가 나온다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const fontDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fonts");
const fontFiles = fs.readdirSync(fontDir).filter((f) => f.endsWith(".otf")).map((f) => path.join(fontDir, f));
const FONT = { fontFiles, loadSystemFonts: false, defaultFontFamily: "Pretendard" };

const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function svgToPng(svg, width) {
  return new Resvg(svg, { font: FONT, fitTo: width ? { mode: "width", value: width } : { mode: "original" } }).render().asPng();
}

// 글자 폭을 실제 글꼴로 재서 줄을 나눈다. 한국어는 띄어쓰기 단위로만 끊는다(keep-all).
// 글꼴을 불러오는 데 시간이 걸리므로 단어 단위로 한 번만 재고 줄 폭은 단어 폭을 더해서 구한다.
const widthCache = new Map();
function measureWord(word, size, weight) {
  const key = `${weight}/${size}/${word}`;
  if (!widthCache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="${size * 2}"><text x="0" y="${size}" font-size="${size}" font-weight="${weight}">${xml(word)}</text></svg>`;
    widthCache.set(key, new Resvg(svg, { font: FONT }).getBBox()?.width ?? 0);
  }
  return widthCache.get(key);
}
function measure(text, size, weight) {
  const words = text.split(" ");
  const space = measureWord("가 가", size, weight) - 2 * measureWord("가", size, weight);
  return words.reduce((sum, w) => sum + measureWord(w, size, weight), 0) + (words.length - 1) * space;
}

// 줄 수는 그대로 두고 폭을 줄여 가며 줄 길이를 고르게 맞춘다 ("…신청 / 방법"처럼 한 단어만 남는 줄 방지).
function wrap(text, size, weight, maxWidth, maxLines) {
  let lines = wrapGreedy(text, size, weight, maxWidth, maxLines);
  if (lines.length < 2 || lines.length > maxLines || lines.at(-1).endsWith("…")) return lines;
  for (let w = maxWidth - 20; w > maxWidth / 2; w -= 20) {
    const tighter = wrapGreedy(text, size, weight, w, maxLines);
    if (tighter.length !== lines.length || tighter.at(-1).endsWith("…")) break;
    lines = tighter;
  }
  return lines;
}

function wrapGreedy(text, size, weight, maxWidth, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || measure(next, size, weight) <= maxWidth) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.includes(" ") && measure(`${last}…`, size, weight) > maxWidth) last = last.slice(0, last.lastIndexOf(" "));
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

// "큰 제목, 부제" 또는 "질문? 부제" 형태의 제목을 두 부분으로 나눈다.
export function splitTitle(title) {
  const m = title.match(/^(.+?[?？])\s+(.+)$/) || title.match(/^(.+?),\s*(.+)$/);
  return m ? [m[1], m[2]] : [title, ""];
}

const LOGO = (x, y, s, color) =>
  `<g transform="translate(${x} ${y}) scale(${s / 32})"><rect width="32" height="32" rx="9" fill="${color}"/><path d="M9.5 16.5l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;

export function ogSvg({ title, category, color, iconPaths, siteTitle, tagline, seed = 0 }) {
  const W = 1200, H = 630, padX = 80;
  const [main, sub] = splitTitle(title);
  const textW = 760;
  let size = 70;
  let mainLines = wrap(main, size, 800, textW, 3);
  if (mainLines.length === 3) { size = 60; mainLines = wrap(main, size, 800, textW, 3); }
  const subSize = 30;
  const subLines = sub ? wrap(sub, subSize, 500, textW, 2) : [];
  const lh = Math.round(size * 1.28), subLh = Math.round(subSize * 1.5);

  // 제목 묶음을 세로 가운데쯤에 놓는다.
  const blockH = mainLines.length * lh + (subLines.length ? 28 + subLines.length * subLh : 0);
  let y = Math.max(200, Math.round((H - blockH) / 2) + 20) + size * 0.82;
  const mainText = mainLines.map((l, i) => `<text x="${padX}" y="${y + i * lh}" font-size="${size}" font-weight="800" fill="#191f28" letter-spacing="-2">${xml(l)}</text>`).join("");
  y += (mainLines.length - 1) * lh + 28 + subSize * 1.1;
  const subText = subLines.map((l, i) => `<text x="${padX}" y="${y + i * subLh}" font-size="${subSize}" font-weight="500" fill="#4e5968" letter-spacing="-0.5">${xml(l)}</text>`).join("");

  // 같은 카테고리라도 배경 원 위치가 조금씩 달라지게 한다.
  const circles = [
    [1010, 120, 300, 980, 560, 150],
    [1080, 520, 320, 900, 60, 130],
    [960, 600, 280, 1130, 110, 170],
    [1100, 300, 260, 860, 580, 120],
  ][seed % 4];
  const chipW = Math.round(measure(category, 26, 700)) + 44;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect width="${W}" height="${H}" fill="${color}" opacity="0.06"/>
  <circle cx="${circles[0]}" cy="${circles[1]}" r="${circles[2]}" fill="${color}" opacity="0.10"/>
  <circle cx="${circles[3]}" cy="${circles[4]}" r="${circles[5]}" fill="${color}" opacity="0.13"/>
  <rect x="0" y="0" width="12" height="${H}" fill="${color}"/>
  <rect x="${padX}" y="72" width="${chipW}" height="48" rx="24" fill="${color}"/>
  <text x="${padX + chipW / 2}" y="105" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${xml(category)}</text>
  ${mainText}
  ${subText}
  <circle cx="1010" cy="315" r="118" fill="#ffffff"/>
  <circle cx="1010" cy="315" r="118" fill="none" stroke="${color}" stroke-opacity="0.25" stroke-width="3"/>
  <g transform="translate(938 243) scale(6)" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</g>
  ${LOGO(padX, 530, 44, "#0e9f6e")}
  <text x="${padX + 60}" y="563" font-size="30" font-weight="800" fill="#191f28" letter-spacing="-1">${xml(siteTitle)}</text>
  <text x="${padX + 60 + measure(siteTitle, 30, 800) + 16}" y="562" font-size="22" font-weight="500" fill="#8b95a1">${xml(tagline)}</text>
</svg>`;
}

// SVG 그림의 원래 크기(viewBox)를 읽는다.
export function svgSize(svg) {
  const vb = svg.match(/viewBox="\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  return vb ? { width: Math.round(+vb[1]), height: Math.round(+vb[2]) } : { width: 0, height: 0 };
}
