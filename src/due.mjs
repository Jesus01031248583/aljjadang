// 예약 발행 확인용: 공개 시각이 지났는데 아직 사이트(sitemap)에 없는 글이 있으면 "due=true"를 출력한다.
// 사용법: node src/due.mjs <현재 사이트의 sitemap.xml 파일>
// GitHub Actions의 정기 실행에서 배포가 필요할 때만 빌드하도록 쓴다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPublic, publishTime } from "./schedule.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "content/posts");
const sitemap = fs.existsSync(process.argv[2] || "") ? fs.readFileSync(process.argv[2], "utf8") : "";

const missing = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const raw = fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");
  const fm = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] || "";
  const post = { slug: path.basename(f, ".md") };
  for (const line of fm.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) post[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (publishTime(post) && isPublic(post) && !sitemap.includes(`/posts/${post.slug}/`)) missing.push(post.slug);
}

if (missing.length) console.log(`공개 시각이 지났지만 사이트에 없는 글: ${missing.join(", ")}`);
console.log(`due=${missing.length > 0}`);
