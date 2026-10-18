import { setup, won, row, parseDate, addMonths, fmtDate } from "./common.js";

// 근로기준법 제60조: 1년 이상 근무하면 15일, 3년차부터 2년마다 1일씩 늘어 최대 25일.
export const leaveForYear = (n) => Math.min(25, 15 + Math.floor((n - 1) / 2));

export function calcLeave({ start, asof }) {
  const s = parseDate(start), a = parseDate(asof);
  if (!s || !a || a < s) return { error: "입사일과 기준일을 확인해 주세요. 기준일이 입사일보다 뒤여야 해요." };
  let months = 0;
  while (months < 12 && addMonths(s, months + 1) <= a) months++;
  let years = 0;
  while (addMonths(s, 12 * (years + 1)) <= a) years++;
  return { s, a, months, years };
}

if (typeof document !== "undefined") {
  setup((v) => {
    const r = calcLeave(v);
    if (r.error) return `<p class="calc-empty">${r.error}</p>`;
    const { s, months, years } = r;
    let head, sub, tip = "";
    if (years === 0) {
      const got = Math.min(months, 11);
      head = got;
      sub = `입사 ${months}개월째 · 1년 미만은 한 달 개근할 때마다 1일씩 생겨요`;
      tip = got < 11
        ? `다음 연차 1일은 ${fmtDate(addMonths(s, months + 1))}에 생겨요. 입사 1년이 지난 다음 날(${fmtDate(addMonths(s, 12))})에는 15일이 새로 생겨요.`
        : `1년 미만 연차 11일을 모두 받았어요. ${fmtDate(addMonths(s, 12))}에 1년이 차면 15일이 새로 생겨요.`;
    } else {
      head = leaveForYear(years);
      sub = `근속 ${years}년 · ${fmtDate(addMonths(s, 12 * years))}에 생긴 연차예요`;
      const nextDays = leaveForYear(years + 1);
      tip = `다음 연차는 ${fmtDate(addMonths(s, 12 * (years + 1)))}에 ${nextDays}일이 생겨요.${years === 1 ? " 입사 첫해에 받은 1년 미만 연차(최대 11일)는 이것과 별개예요." : ""}`;
    }
    const steps = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    const table = steps.map((n) => {
      const cur = years >= n && (n === 21 || years < n + 2);
      return `<tr class="${cur ? "is-current" : ""}"><th scope="row">${n}년 이상 (${fmtDate(addMonths(s, 12 * n))}부터)</th><td>${leaveForYear(n)}일</td></tr>`;
    }).join("");
    let pay = "";
    if (v.unused > 0 && v.monthly > 0) {
      const daily = Math.floor((v.monthly / 209) * 8);
      pay = `
<p class="calc-sub">미사용 연차수당</p>
<table class="calc-table">
  ${row("1일 통상임금 (월 통상임금 ÷ 209시간 × 8시간)", `${won(daily)}원`)}
  ${row(`연차수당 (${v.unused}일)`, `${won(daily * v.unused)}원`, "is-total")}
</table>`;
    }
    return `
<div class="calc-headline"><span>${years === 0 ? "지금까지 생긴 연차" : "올해 연차"}</span><strong>${head}<small>일</small></strong><em>${sub}</em></div>
<p class="calc-tip">${tip}</p>
<p class="calc-sub">근속연수별 연차 (내 입사일 기준)</p>
<table class="calc-table">
  <tr class="${years === 0 ? "is-current" : ""}"><th scope="row">1년 미만 (매달 1일)</th><td>최대 11일</td></tr>
  ${table}
</table>
${pay}
<p class="calc-note">입사일 기준으로 계산했어요. 회사가 1월 1일 기준(회계연도)으로 연차를 주면 첫해 일수가 달라질 수 있지만, 퇴사할 때는 입사일 기준보다 적지 않게 정산해야 해요. 상시 5인 미만 사업장과 주 15시간 미만 근로자는 연차 규정이 적용되지 않아요.</p>`;
  });
}
