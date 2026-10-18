// 계산기 기준값 자동 감시. GitHub Actions에서 매일 실행한다 (.github/workflows/rates-watch.yml).
// 한국은행 기준금리, 관련 법령의 시행일, 유효기간, 정기 점검일을 확인하고
// 달라진 점이 있으면 GitHub 이슈로 알린다. 값은 절대 자동으로 바꾸지 않는다.
// 로컬에서 `node src/watch.mjs` 로 돌리면 결과만 출력한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_RATE, VALID_UNTIL, MIN_WAGE, RATES_CHECKED } from "./calc/rates.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sources = JSON.parse(fs.readFileSync(path.join(root, "src", "watch-sources.json"), "utf8"));
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const year = Number(today.slice(0, 4));
const LABEL = "계산기 점검";
const UA = { "User-Agent": "Mozilla/5.0 (aljjadang rates-watch)" };

const findings = []; // { title, body, failure? }

async function getText(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.text();
    } catch { /* 재시도 */ }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`접속 실패: ${url}`);
}

// 1. 한국은행 기준금리
async function checkBaseRate() {
  const url = "https://www.bok.or.kr/portal/singl/baseRate/list.do?dataSeCd=01&menuNo=200643";
  try {
    const html = await getText(url);
    const rows = [...html.matchAll(/<td[^>]*>\s*(20\d{2})\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*(\d+\.\d+)\s*<\/td>/g)];
    if (!rows.length) throw new Error("기준금리 표를 읽지 못했습니다 (페이지 구조 변경 가능성)");
    const [, y, md, rate] = rows[0];
    const latest = Number(rate);
    console.log(`기준금리: 사이트 ${latest}% (${y} ${md}) / rates.js ${BASE_RATE.rate}%`);
    if (latest !== BASE_RATE.rate) {
      findings.push({
        title: `기준금리 변경: ${BASE_RATE.rate.toFixed(2)}% → ${latest.toFixed(2)}% (${y}년 ${md})`,
        body: [
          `한국은행 기준금리가 바뀌었습니다: **${BASE_RATE.rate.toFixed(2)}% → ${latest.toFixed(2)}%** (${y}년 ${md})`,
          "",
          `- 영향: 전월세 전환 계산기의 법정 전환율 상한 (기준금리 + 2%) ${Math.min(10, BASE_RATE.rate + 2)}% → ${Math.min(10, latest + 2)}%`,
          "- 고칠 곳: `src/calc/rates.js`의 BASE_RATE, `content/calculators/jeonse-monthly.md` 제목·본문",
          `- 출처: ${url}`,
        ].join("\n"),
      });
    }
  } catch (e) {
    findings.push({ failure: true, title: "자동 감시 실패: 한국은행 기준금리", body: `${e.message}\n\n직접 확인: ${url}` });
  }
}

// 2. 법령 시행일 (현행 법령이 바뀌면 개정된 것)
async function checkLaws() {
  for (const law of sources.laws) {
    const url = `https://www.law.go.kr/LSW/lsInfoP.do?lsNm=${encodeURIComponent(law.name)}`;
    try {
      const html = await getText(url);
      const m = html.match(/시행 (20\d{2}\. ?\d{1,2}\. ?\d{1,2}\.)\] \[([^,\]]+),\s*(20\d{2}\. ?\d{1,2}\. ?\d{1,2}\.),\s*([^\]]+)\]/);
      if (!m) throw new Error("시행일을 읽지 못했습니다 (페이지 구조 변경 가능성)");
      const [, effective, number, promulgated, kind] = m;
      console.log(`${law.name}: ${effective} ${number}${number === law.number ? "" : "  ← 변경"}`);
      if (number !== law.number) {
        findings.push({
          title: `법령 개정: ${law.name} (${number}, ${effective} 시행)`,
          body: [
            `**${law.name}**의 현행 법령이 바뀌었습니다.`,
            "",
            `- 이전: ${law.number}, ${law.effective} 시행`,
            `- 지금: ${number}, ${effective} 시행 (${promulgated} ${kind.trim()})`,
            `- 이 법령을 쓰는 계산기: ${law.used}`,
            `- 개정 이유 보기: https://www.law.go.kr/LSW/lsInfoP.do?lsNm=${encodeURIComponent(law.name)}&viewCls=lsRvsDocInfoR`,
            "",
            "개정 내용이 계산기와 관계없으면 `src/watch-sources.json`의 번호·시행일만 새 값으로 바꾸면 됩니다.",
          ].join("\n"),
        });
      }
    } catch (e) {
      findings.push({ failure: true, title: `자동 감시 실패: ${law.name}`, body: `${e.message}\n\n직접 확인: ${url}` });
    }
  }
}

// 3. 유효기간이 지난 값
function checkExpiry() {
  for (const [key, { until, label }] of Object.entries(VALID_UNTIL)) {
    if (today > until) {
      findings.push({
        title: `유효기간 지남: ${label} (${until}까지)`,
        body: `\`src/calc/rates.js\`의 VALID_UNTIL.${key}가 ${until}에 끝났습니다. 지금 계산기 화면에는 "새 기준 확인 중" 안내가 나가고 있습니다. 새 기준을 확인해 값과 날짜를 고쳐 주세요.`,
      });
    }
  }
  if (!MIN_WAGE[year]) {
    findings.push({ title: `${year}년 최저임금 미입력`, body: `\`src/calc/rates.js\`의 MIN_WAGE에 ${year}년 값이 없습니다.` });
  }
}

// 4. 정기 점검일
function checkReminders() {
  for (const r of sources.reminders) {
    if (today.slice(5) >= r.date && RATES_CHECKED < `${year}-${r.date}`) {
      findings.push({
        reminder: true,
        title: r.title.replace("{Y+1}", year + 1).replace("{Y}", year),
        body: `정기 점검일(${year}-${r.date})이 지났습니다. 관련 기준이 바뀌었는지 확인하고, 점검을 마치면 \`src/calc/rates.js\`의 RATES_CHECKED를 그날로 고쳐 주세요.`,
      });
    }
  }
}

// GitHub 이슈 만들기: 같은 제목의 이슈가 이미 있으면 새로 만들지 않는다.
// 실패 알림은 열린 이슈만, 나머지는 닫힌 이슈까지 확인해 한 번만 만든다.
async function report() {
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return;
  const api = (p, opts = {}) => fetch(`https://api.github.com/repos/${repo}${p}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", ...UA },
  });
  await api("/labels", { method: "POST", body: JSON.stringify({ name: LABEL, color: "0e9f6e", description: "계산기 기준값 자동 감시" }) }).catch(() => {});
  const existing = [];
  for (let page = 1; page <= 5; page++) {
    const res = await api(`/issues?state=all&labels=${encodeURIComponent(LABEL)}&per_page=100&page=${page}`);
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) break;
    existing.push(...list);
  }
  for (const f of findings) {
    const title = `[${LABEL}] ${f.title}`;
    const dup = existing.find((i) => i.title === title && (f.failure ? i.state === "open" : true));
    if (dup) { console.log(`이미 있음: ${title}`); continue; }
    const body = `${f.body}\n\n---\n자동 감시(${today})가 만든 알림입니다. 계산기 값은 자동으로 바뀌지 않으며, 확인 후 반영합니다.`;
    const res = await api("/issues", { method: "POST", body: JSON.stringify({ title, body, labels: [LABEL] }) });
    console.log(res.ok ? `이슈 생성: ${title}` : `이슈 생성 실패(${res.status}): ${title}`);
  }
}

// 알림 경로 시험: watch-sources.json에 "testIssue" 제목을 넣으면 그 제목으로 이슈를 한 번 만든다.
if (sources.testIssue) findings.push({ title: sources.testIssue, body: "알림 메일이 잘 오는지 확인하는 시험 이슈입니다. 메일을 받으셨다면 이 이슈는 닫아도 됩니다." });

await checkBaseRate();
await checkLaws();
checkExpiry();
checkReminders();
console.log(findings.length ? `\n알림 ${findings.length}건:\n${findings.map((f) => `- ${f.title}`).join("\n")}` : "\n이상 없음");
await report();
