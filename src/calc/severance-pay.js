import { setup, won, floor10, row, parseDate, daysBetween, addMonths, fmtDate } from "./common.js";
import { INCOME_TAX_BRACKETS } from "./rates.js";

export function progressiveTax(base) {
  const [, rate, deduction] = INCOME_TAX_BRACKETS.find(([max]) => base <= max);
  return Math.max(0, base * rate - deduction);
}

// 근속연수공제 (소득세법 제48조, 2023년 이후 퇴직분)
function serviceDeduction(years) {
  if (years <= 5) return 1e6 * years;
  if (years <= 10) return 5e6 + 2e6 * (years - 5);
  if (years <= 20) return 15e6 + 2.5e6 * (years - 10);
  return 40e6 + 3e6 * (years - 20);
}

// 환산급여공제
function convertedDeduction(c) {
  if (c <= 8e6) return c;
  if (c <= 70e6) return 8e6 + (c - 8e6) * 0.6;
  if (c <= 100e6) return 45.2e6 + (c - 70e6) * 0.55;
  if (c <= 300e6) return 61.7e6 + (c - 100e6) * 0.45;
  return 151.7e6 + (c - 300e6) * 0.35;
}

// 근속연수: 1년 미만 끝수는 1년으로 본다.
export function serviceYears(start, end) {
  let n = 0;
  while (addMonths(start, 12 * (n + 1)) <= end) n++;
  return addMonths(start, 12 * n) < end ? n + 1 : n;
}

export function retirementTax(pay, years) {
  const deduction = Math.min(serviceDeduction(years), pay);
  const converted = ((pay - deduction) * 12) / years;
  const base = Math.max(0, converted - convertedDeduction(converted));
  const tax = floor10((progressiveTax(base) * years) / 12);
  return { tax, local: floor10(tax * 0.1) };
}

export function calcSeverance({ start, end, wage3, bonus, leave }) {
  const s = parseDate(start), e = parseDate(end);
  if (!s || !e || e <= s) return { error: "입사일과 퇴직일을 확인해 주세요. 퇴직일이 입사일보다 뒤여야 해요." };
  const days = daysBetween(s, e);
  const from3 = addMonths(e, -3);
  const days3 = daysBetween(from3, e);
  const wageTotal = wage3 + (bonus * 3) / 12 + (leave * 3) / 12;
  const daily = wageTotal / days3;
  const eligible = addMonths(s, 12) <= e;
  const pay = eligible ? Math.floor(daily * 30 * (days / 365)) : 0;
  const years = serviceYears(s, e);
  const tax = eligible ? retirementTax(pay, years) : { tax: 0, local: 0 };
  return { days, from3, last3: new Date(e - 864e5), days3, daily, eligible, pay, years, ...tax, oneYear: addMonths(s, 12) };
}

if (typeof document !== "undefined") {
  setup((v) => {
    const r = calcSeverance(v);
    if (r.error) return `<p class="calc-empty">${r.error}</p>`;
    if (!v.wage3) return `<p class="calc-empty">퇴직 전 3개월 임금 총액을 입력하면 바로 계산돼요.</p>`;
    if (!r.eligible) {
      return `
<div class="calc-headline"><span>예상 퇴직금</span><strong>0<small>원</small></strong><em>재직 ${won(r.days)}일 · 1년 미만이라 퇴직금이 없어요</em></div>
<p class="calc-tip">퇴직금은 계속 일한 기간이 1년 이상이어야 생겨요. 이 입사일이면 퇴직일이 ${fmtDate(r.oneYear)} 이후일 때부터 받을 수 있어요.</p>`;
    }
    const net = r.pay - r.tax - r.local;
    return `
<div class="calc-headline"><span>예상 퇴직금 (세전)</span><strong>${won(r.pay)}<small>원</small></strong><em>퇴직소득세를 빼면 약 ${won(net)}원 · 재직 ${won(r.days)}일</em></div>
<table class="calc-table">
  ${row("재직일수", `${won(r.days)}일 (근속연수 ${r.years}년)`)}
  ${row("평균임금 산정 기간", `${fmtDate(r.from3)}~${fmtDate(r.last3)} (${r.days3}일)`)}
  ${row("1일 평균임금", `${won(Math.floor(r.daily))}원`)}
  ${row("퇴직금 (세전)", `${won(r.pay)}원`, "is-total")}
  ${row("퇴직소득세", `− ${won(r.tax)}원`)}
  ${row("지방소득세", `− ${won(r.local)}원`)}
  ${row("세후 예상 수령액", `${won(net)}원`, "is-total")}
</table>
<p class="calc-note">퇴직금 = 1일 평균임금 × 30일 × (재직일수 ÷ 365). 평균임금이 통상임금보다 적으면 통상임금으로 계산해요. 퇴직금을 IRP 계좌로 받으면 퇴직소득세를 바로 떼지 않고, 나중에 연금으로 받을 때 30~40% 줄어든 세율로 내요.</p>`;
  });
}
