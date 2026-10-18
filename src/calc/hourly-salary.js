import { setup, won, row, todayKST } from "./common.js";
import { MIN_WAGE } from "./rates.js";
import { weeklyHolidayHours, monthlyHours } from "./labor.js";

if (typeof document !== "undefined") {
  // 입력 종류(시급·월급·연봉)를 바꾸면 지금 결과를 새 단위 금액으로 바꿔 넣는다.
  let last = null, prevFrom = null;
  setup((v) => {
    const week = Math.min(v.week, 40);
    if (!v.amount || !week) return `<p class="calc-empty">금액과 1주 근로시간을 입력하면 바로 계산돼요.</p>`;
    const hours = monthlyHours(week);
    let hourly, monthly;
    if (v.from === "hourly") { hourly = v.amount; monthly = hourly * hours; }
    else if (v.from === "monthly") { monthly = v.amount; hourly = monthly / hours; }
    else { monthly = v.amount / 12; hourly = monthly / hours; }
    const annual = monthly * 12;
    last = { hourly, monthly, annual };
    const year = Number(todayKST().slice(0, 4));
    const years = [year, year + 1].filter((y) => MIN_WAGE[y]);
    const minRows = years.map((y) => {
      const diff = hourly - MIN_WAGE[y];
      const d = Math.round(diff);
      const status = d === 0 ? "최저임금과 같아요" : d > 0 ? `최저임금보다 ${won(d)}원 많아요` : `최저임금보다 ${won(-d)}원 적어요`;
      return `<tr class="${diff < 0 ? "is-low" : ""}"><th scope="row">${y}년 최저임금 ${won(MIN_WAGE[y])}원</th><td>${status}</td></tr>`;
    }).join("");
    const label = { hourly: "월급 (세전)", monthly: "시급", annual: "시급" }[v.from];
    const value = v.from === "hourly" ? monthly : hourly;
    return `
<div class="calc-headline"><span>${label}</span><strong>${won(value)}<small>원</small></strong><em>월 ${hours}시간 기준 (1주 ${week}시간${weeklyHolidayHours(week) ? ` + 주휴 ${Math.round(weeklyHolidayHours(week) * 100) / 100}시간` : ", 주휴 없음"})</em></div>
<table class="calc-table">
  ${row("시급", `${won(hourly)}원`)}
  ${row("일급 (하루 8시간)", `${won(hourly * 8)}원`)}
  ${row("월급", `${won(monthly)}원`, "is-total")}
  ${row("연봉 (월급 × 12)", `${won(annual)}원`, "is-total")}
</table>
<p class="calc-sub">최저임금과 비교</p>
<table class="calc-table">${minRows}</table>
${v.week > 40 ? `<p class="calc-warn">주 40시간을 넘는 시간은 연장근로라서 시급의 1.5배를 따로 받아요. 여기서는 40시간까지만 계산했어요.</p>` : ""}
<p class="calc-note">세전 금액이에요. 월급에 연장·야간근로 수당이나 1개월을 넘는 주기로 받는 돈이 섞여 있으면 실제 시급과 다를 수 있어요.</p>`;
  }, {
    stale: ["minWage"],
    onChange(form, v) {
      if (prevFrom && v.from !== prevFrom && last) form.elements.amount.value = Math.round(last[v.from]).toLocaleString("ko-KR");
      prevFrom = v.from;
      const label = form.querySelector("[data-label-hourly]");
      label.textContent = label.dataset[`label${v.from[0].toUpperCase()}${v.from.slice(1)}`];
    },
  });
}
