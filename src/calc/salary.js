import { setup, won, floor10, row } from "./common.js";
import { INSURANCE as R } from "./rates.js";
import { WAGE_TAX_ROWS, WAGE_TAX_END, TAX_AT_10000 } from "./wage-tax-table.js";

// 간이세액표에서 월 과세급여(원)·공제대상가족 수에 맞는 소득세를 찾는다.
function wageTax(pay, family) {
  const col = Math.min(Math.max(family, 1), 11);
  const k = pay / 1000;
  if (k < WAGE_TAX_ROWS[0][0]) return 0;
  if (k < WAGE_TAX_END) {
    let lo = 0, hi = WAGE_TAX_ROWS.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (WAGE_TAX_ROWS[mid][0] <= k) lo = mid; else hi = mid - 1; }
    return WAGE_TAX_ROWS[lo][col];
  }
  // 월급여 1,000만 원 이상: 1,000만 원 세액에 별표 2의 계산식을 더한다.
  const base = TAX_AT_10000[col - 1];
  const over = (from) => pay - from * 1000;
  let add;
  if (k <= 14000) add = over(10000) * 0.98 * 0.35 + 25000;
  else if (k <= 28000) add = 1397000 + over(14000) * 0.98 * 0.38;
  else if (k <= 30000) add = 6610600 + over(28000) * 0.98 * 0.40;
  else if (k <= 45000) add = 7394600 + over(30000) * 0.40;
  else if (k <= 87000) add = 13394600 + over(45000) * 0.42;
  else add = 31034600 + over(87000) * 0.45;
  return floor10(base + add);
}

// 8세 이상 20세 이하 자녀 수에 따라 간이세액에서 빼는 금액 (2026. 2. 27. 개정)
function childCredit(n) {
  if (n <= 0) return 0;
  if (n === 1) return 20830;
  return 45830 + (n - 2) * 33330;
}

export function calcSalary({ annual, severance, nontax, family, kids, ratio }) {
  const monthly = Math.floor(annual / (severance === "1" ? 13 : 12));
  const taxable = Math.max(0, monthly - nontax);
  const pensionBase = Math.min(Math.max(Math.floor(taxable / 1000) * 1000, R.pensionMin), R.pensionMax);
  const pension = taxable > 0 ? floor10(pensionBase * R.pension) : 0;
  const health = floor10(taxable * R.health);
  const care = floor10(health * R.longTermCare);
  const employment = floor10(taxable * R.employment);
  const fam = Number(family);
  const kidCount = Math.min(Number(kids), fam - 1);
  const tableTax = Math.max(0, wageTax(taxable, fam) - childCredit(kidCount));
  const incomeTax = floor10(tableTax * Number(ratio) / 100);
  const localTax = floor10(incomeTax * 0.1);
  const total = pension + health + care + employment + incomeTax + localTax;
  return { monthly, taxable, pension, health, care, employment, incomeTax, localTax, total, net: monthly - total, kidCount };
}

if (typeof document !== "undefined") {
  setup((v) => {
    if (!v.annual) return `<p class="calc-empty">연봉을 입력하면 바로 계산돼요.</p>`;
    const r = calcSalary(v);
    const pct = r.monthly ? ((r.total / r.monthly) * 100).toFixed(1) : "0";
    return `
<div class="calc-headline"><span>월 예상 실수령액</span><strong>${won(r.net)}<small>원</small></strong><em>연 환산 ${won(r.net * 12)}원 · 공제율 ${pct}%</em></div>
<table class="calc-table">
  ${row("월 급여 (세전)", `${won(r.monthly)}원`)}
  ${row("국민연금 (4.75%)", `${won(r.pension)}원`)}
  ${row("건강보험 (3.595%)", `${won(r.health)}원`)}
  ${row("장기요양보험", `${won(r.care)}원`)}
  ${row("고용보험 (0.9%)", `${won(r.employment)}원`)}
  ${row("소득세", `${won(r.incomeTax)}원`)}
  ${row("지방소득세", `${won(r.localTax)}원`)}
  ${row("공제 합계", `${won(r.total)}원`, "is-total")}
</table>
${v.kids > r.kidCount ? `<p class="calc-warn">자녀 수는 부양가족 수(본인 포함)보다 적어야 해요. ${r.kidCount}명으로 계산했어요.</p>` : ""}
<p class="calc-note">${R.year}년 요율과 근로소득 간이세액표(2026. 2. 27. 개정) 기준이에요. 회사마다 비과세 항목이나 보험료 정산이 달라 명세서와 몇십 원~몇천 원 차이가 날 수 있어요.</p>`;
  }, { stale: ["insurance", "pensionCap"] });
}
