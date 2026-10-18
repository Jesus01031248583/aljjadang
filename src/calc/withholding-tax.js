import { setup, won, floor10, row } from "./common.js";
import { BUSINESS_WITHHOLDING, OTHER_INCOME } from "./rates.js";

// 세전 지급액에서 떼는 소득세·지방소득세 (각각 10원 미만 버림)
export function withhold(gross, type) {
  let tax;
  if (type === "other") {
    const income = gross * (1 - OTHER_INCOME.expenseRate);
    tax = income <= OTHER_INCOME.exemptUnder ? 0 : floor10(income * OTHER_INCOME.rate);
  } else tax = floor10(gross * BUSINESS_WITHHOLDING);
  const local = floor10(tax * 0.1);
  return { tax, local, net: gross - tax - local };
}

// 실제 받은 돈에서 세전 지급액을 거꾸로 찾는다. 10원 미만 버림 때문에 같은 실수령액이 나오는 세전 금액이 여럿이면
// 단순 역산값(실수령 ÷ 0.967)에 가장 가까운 것을, 딱 맞는 금액이 없으면 그 돈 이상을 받는 가장 작은 세전 금액을 고른다.
export function grossFromNet(net, type) {
  // 기타소득은 과세최저한(지급액 12만 5천 원 이하 비과세) 때문에 세전과 실수령이 같은 경우가 있다.
  if (type === "other" && withhold(net, type).net === net) return net;
  const x = Math.round(net / (1 - (type === "other" ? 0.088 : 0.033)));
  let best = null;
  for (let g = x - 40; g <= x + 40; g++) {
    if (withhold(g, type).net === net && (best === null || Math.abs(g - x) < Math.abs(best - x))) best = g;
  }
  if (best !== null) return best;
  let g = x - 40;
  while (withhold(g, type).net < net) g++;
  return g;
}

if (typeof document !== "undefined") {
  setup((v) => {
    if (!v.amount) return `<p class="calc-empty">금액을 입력하면 바로 계산돼요.</p>`;
    const gross = v.dir === "net" ? grossFromNet(v.amount, v.type) : v.amount;
    const r = withhold(gross, v.type);
    const other = v.type === "other";
    const head = v.dir === "net" ? ["세전 지급액", gross, `실제 입금액 ${won(r.net)}원 기준`] : ["실제 받는 돈", r.net, `세전 ${won(gross)}원에서 ${won(r.tax + r.local)}원을 떼요`];
    return `
<div class="calc-headline"><span>${head[0]}</span><strong>${won(head[1])}<small>원</small></strong><em>${head[2]}</em></div>
<table class="calc-table">
  ${row("세전 지급액", `${won(gross)}원`)}
  ${other ? row("필요경비 (60%)", `${won(gross * OTHER_INCOME.expenseRate)}원`) : ""}
  ${row(other ? "소득세 (경비 뺀 금액의 20%)" : "소득세 (3%)", `− ${won(r.tax)}원`)}
  ${row(other ? "지방소득세 (2%)" : "지방소득세 (0.3%)", `− ${won(r.local)}원`)}
  ${row("실제 받는 돈", `${won(r.net)}원`, "is-total")}
</table>
${other && r.tax === 0 ? `<p class="calc-tip">기타소득금액(지급액의 40%)이 건별 5만 원 이하라 세금을 떼지 않아요. 지급액으로는 12만 5천 원 이하예요.</p>` : ""}
<p class="calc-note">${other
  ? "일시적인 강연료·원고료·심사료처럼 필요경비 60%가 인정되는 기타소득 기준이에요. 1년 기타소득금액이 300만 원 이하면 5월 종합소득세 신고 때 합산할지 분리과세로 끝낼지 고를 수 있어요."
  : "떼인 3.3%는 미리 낸 세금이에요. 다음 해 5월 종합소득세 신고로 실제 세금과 정산하고, 덜 냈으면 더 내고 더 냈으면 돌려받아요."}</p>`;
  }, {
    onChange(form, v) {
      const label = form.querySelector("[data-label-gross]");
      label.textContent = v.dir === "net" ? label.dataset.labelNet : label.dataset.labelGross;
    },
  });
}
