import { setup, won, floor10, row } from "./common.js";
import { INTEREST_TAX } from "./rates.js";

// 세전 이자. 적금은 k번째 달에 넣은 돈이 (기간 - k + 1)개월 동안 이자를 받는다.
export function interestOf({ kind, amount, months, rate, compound }) {
  const r = rate / 100 / 12;
  if (kind === "deposit") return compound ? amount * ((1 + r) ** months - 1) : amount * r * months;
  if (compound) {
    let s = 0;
    for (let k = 1; k <= months; k++) s += amount * ((1 + r) ** k - 1);
    return s;
  }
  return (amount * r * (months * (months + 1))) / 2;
}

const pct = (n, d = 1) => n.toFixed(d).replace(/\.?0+$/, "");

if (typeof document !== "undefined") {
  setup((v) => {
    const months = Math.floor(v.months);
    if (!v.amount || !months) return `<p class="calc-empty">금액과 기간을 입력하면 바로 계산돼요.</p>`;
    if (months > 600) return `<p class="calc-empty">기간은 600개월까지 계산할 수 있어요.</p>`;
    const saving = v.kind === "saving";
    const principal = saving ? v.amount * months : v.amount;
    const interest = Math.floor(interestOf({ kind: v.kind, amount: v.amount, months, rate: v.rate, compound: v.compound === "1" }));
    const taxRate = v.tax === "free" ? 0 : v.tax === "custom" ? v.taxrate / 100 : INTEREST_TAX;
    const tax = floor10(interest * taxRate);
    const after = interest - tax;
    // 적금은 넣은 돈이 평균 (기간+1)/2개월만 이자를 받는다. 원금 합계 대비 연 수익률로 바꿔 보여 준다.
    const avgMonths = (months + 1) / 2;
    const effective = (interest / principal) * (12 / months) * 100;
    return `
<div class="calc-headline"><span>만기 세후 수령액</span><strong>${won(principal + after)}<small>원</small></strong><em>원금 ${won(principal)}원 + 세후 이자 ${won(after)}원</em></div>
<table class="calc-table">
  ${row("원금 합계", `${won(principal)}원`)}
  ${row("세전 이자", `${won(interest)}원`)}
  ${row(`이자 과세 (${pct(taxRate * 100)}%)`, `− ${won(tax)}원`)}
  ${row("세후 이자", `${won(after)}원`, "is-total")}
</table>
${saving ? `<p class="calc-tip">적금 금리는 넣은 날부터 만기까지만 붙어요. 매달 넣은 돈이 평균 ${pct(avgMonths)}개월만 이자를 받기 때문에, 원금 합계 기준 연 수익률로 바꾸면 약 ${effective.toFixed(2)}%예요.</p>` : ""}
<p class="calc-note">은행은 실제 날짜 수로 이자를 계산하고 원 단위 처리 방식도 달라 몇 원~몇십 원 차이가 날 수 있어요. 중도 해지하면 약정 금리보다 낮은 중도해지 금리가 적용돼요.</p>`;
  }, {
    onChange(form, v) {
      const label = form.querySelector("[data-label-saving]");
      label.textContent = v.kind === "saving" ? label.dataset.labelSaving : label.dataset.labelDeposit;
      form.querySelector("[data-show-when]").hidden = v.tax !== "custom";
    },
  });
}
