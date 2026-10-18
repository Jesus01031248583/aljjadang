import { setup, won, row } from "./common.js";
import { MIN_WAGE } from "./rates.js";
import { WEEKS_PER_MONTH, weeklyHolidayHours } from "./labor.js";

const hrs = (n) => String(Math.round(n * 100) / 100);

if (typeof document !== "undefined") {
  setup((v) => {
    const week = Math.round(v.hours * Number(v.days) * 100) / 100;
    if (!v.wage || !week) return `<p class="calc-empty">시급과 근무시간을 입력하면 바로 계산돼요.</p>`;
    const year = new Date().getFullYear();
    const min = MIN_WAGE[year] ?? MIN_WAGE[Math.max(...Object.keys(MIN_WAGE).map(Number))];
    const next = MIN_WAGE[year + 1];
    const warn = [];
    if (v.wage < min) warn.push(`입력한 시급이 ${year}년 최저임금(${won(min)}원)보다 낮아요. 수습 감액 같은 예외가 아니라면 최저임금 이상을 받아야 해요.`);
    if (week > 40) warn.push("주 40시간을 넘는 시간은 연장근로예요. 5인 이상 사업장이면 그 시간에는 시급의 50%를 더 받아요. 주휴수당은 40시간 기준(8시간분)까지만 계산했어요.");
    const warnHtml = warn.map((w) => `<p class="calc-warn">${w}</p>`).join("");
    if (week < 15) {
      return `
<div class="calc-headline"><span>1주 주휴수당</span><strong>0<small>원</small></strong><em>1주 근무 ${hrs(week)}시간 · 15시간 미만이라 주휴수당이 없어요</em></div>
<p class="calc-tip">1주 소정근로시간이 15시간 이상이어야 주휴수당이 생겨요. 주 ${hrs(15 - week)}시간을 더 일하는 조건이면 받을 수 있어요.</p>
${warnHtml}`;
    }
    const hh = weeklyHolidayHours(week);
    const workPay = Math.round(week * v.wage);
    const holidayPay = Math.round(hh * v.wage);
    const monthHours = Math.round((week + hh) * WEEKS_PER_MONTH);
    return `
<div class="calc-headline"><span>1주 주휴수당</span><strong>${won(holidayPay)}<small>원</small></strong><em>1주 근무 ${hrs(week)}시간 → 주휴 ${hrs(hh)}시간분</em></div>
<table class="calc-table">
  ${row("1주 근무 급여", `${won(workPay)}원`)}
  ${row("1주 주휴수당", `${won(holidayPay)}원`)}
  ${row("1주 합계", `${won(workPay + holidayPay)}원`, "is-total")}
  ${row("월 주휴수당 (평균 4.345주)", `${won(holidayPay * WEEKS_PER_MONTH)}원`)}
  ${row(`월 예상 급여 (${monthHours}시간)`, `${won(monthHours * v.wage)}원`, "is-total")}
</table>
${warnHtml}
<p class="calc-note">세전 금액이에요. 그 주에 정한 근무일을 모두 나가야(개근) 주휴수당이 생겨요.${next ? ` ${year + 1}년 1월부터 최저임금은 시간당 ${won(next)}원이에요.` : ""}</p>`;
  });
}
