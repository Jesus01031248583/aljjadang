// 계산기 공통 도구: 숫자 입력 서식, 입력값 읽기, 주소(쿼리)로 상태 공유.

export const won = (n) => Math.round(n).toLocaleString("ko-KR");
export const floor10 = (n) => Math.floor(n / 10 + 1e-9) * 10;

// 날짜: "2026-10-31" 문자열을 UTC 기준 Date로 다룬다 (시간대 영향 없이 날짜만 계산).
export const parseDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);
export const daysBetween = (a, b) => Math.round((b - a) / 864e5);
// 월을 더한다. 1월 31일 + 1개월처럼 없는 날이면 그달 말일로 맞춘다.
export function addMonths(d, n) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last)));
}
export const fmtDate = (d) => `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}.`;
export const todayKST = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// 36,000,000 → "3,600만 원", 150,000,000 → "1억 5,000만 원"
export function koMoney(n) {
  n = Math.floor(n);
  if (n < 10000) return `${n.toLocaleString("ko-KR")}원`;
  const eok = Math.floor(n / 1e8);
  const man = Math.floor((n % 1e8) / 1e4);
  const rest = n % 1e4;
  return [eok ? `${eok.toLocaleString("ko-KR")}억` : "", man ? `${man.toLocaleString("ko-KR")}만` : "", rest ? rest.toLocaleString("ko-KR") : ""]
    .filter(Boolean).join(" ") + " 원";
}

// 입력하는 동안 천 단위 쉼표를 넣고, 커서 위치는 숫자 기준으로 유지한다.
function formatMoneyInput(el) {
  const pos = el.selectionStart ?? el.value.length;
  const digitsBefore = el.value.slice(0, pos).replace(/\D/g, "").length;
  const raw = el.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
  const out = raw ? Number(raw).toLocaleString("ko-KR") : "";
  el.value = out;
  let i = 0;
  for (let seen = 0; i < out.length && seen < digitsBefore; i++) if (/\d/.test(out[i])) seen++;
  if (document.activeElement === el) el.setSelectionRange(i, i);
}

function cleanDecimal(el) {
  const v = el.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  if (v !== el.value) el.value = v;
}

// form 안의 name 달린 입력을 읽어 객체로 돌려준다.
function read(form) {
  const v = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "radio") { if (el.checked) v[el.name] = el.value; }
    else if (el.type === "checkbox") v[el.name] = el.checked;
    else if (el.dataset.money !== undefined || el.dataset.num !== undefined) v[el.name] = Number(el.value.replace(/[^\d.]/g, "")) || 0;
    else v[el.name] = el.value;
  }
  return v;
}

function fromQuery(form) {
  const q = new URLSearchParams(location.search);
  for (const el of form.elements) {
    if (!el.name || !q.has(el.name)) continue;
    const val = q.get(el.name);
    if (el.type === "radio") el.checked = el.value === val;
    else if (el.type === "checkbox") el.checked = val === "1";
    else el.value = val;
    if (el.dataset.money !== undefined) formatMoneyInput(el);
  }
}

function toQuery(form) {
  const q = new URLSearchParams();
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "radio") { if (el.checked) q.set(el.name, el.value); }
    else if (el.type === "checkbox") q.set(el.name, el.checked ? "1" : "0");
    else q.set(el.name, el.value.replace(/,/g, ""));
  }
  history.replaceState(null, "", `${location.pathname}?${q}`);
}

// 계산기 하나를 연결한다. compute(값) 은 결과 HTML 문자열을 돌려준다.
// 입력이 바뀔 때마다 주소에 값을 담아 두어, 링크만 보내도 같은 결과가 열리게 한다.
export function setup(compute, { onChange } = {}) {
  const root = document.querySelector(".calc");
  const form = root.querySelector("form");
  const out = root.querySelector(".calc-result");
  for (const el of form.querySelectorAll("[data-today]")) if (!el.value) el.value = todayKST();
  fromQuery(form);
  for (const el of form.querySelectorAll("[data-money]")) formatMoneyInput(el);
  // 숫자 칸을 누르면 기존 값을 통째로 선택해서 바로 새 값을 칠 수 있게 한다.
  for (const el of form.querySelectorAll("[data-money], [data-num]")) el.addEventListener("focus", () => requestAnimationFrame(() => el.select()));
  const hints = () => {
    for (const el of form.querySelectorAll("[data-money]")) {
      const hint = form.querySelector(`[data-hint-for="${el.name}"]`);
      if (hint) hint.textContent = el.value ? koMoney(Number(el.value.replace(/\D/g, ""))) : "";
    }
  };
  const run = () => {
    const v = read(form);
    onChange?.(form, v);
    hints();
    out.innerHTML = compute(read(form));
  };
  form.addEventListener("input", (e) => {
    if (e.target.dataset.money !== undefined) formatMoneyInput(e.target);
    if (e.target.dataset.num !== undefined) cleanDecimal(e.target);
    run();
    toQuery(form);
  });
  form.addEventListener("change", () => { run(); toQuery(form); });
  form.addEventListener("submit", (e) => e.preventDefault());
  run();

  const share = root.querySelector("[data-share]");
  share?.addEventListener("click", async () => {
    toQuery(form);
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); share.textContent = "링크를 복사했어요"; setTimeout(() => (share.textContent = "결과 링크 공유"), 2000); }
    } catch { /* 공유 창을 닫은 경우 */ }
  });
}

// 결과 표의 한 줄
export const row = (label, value, cls = "") => `<tr class="${cls}"><th scope="row">${label}</th><td>${value}</td></tr>`;
