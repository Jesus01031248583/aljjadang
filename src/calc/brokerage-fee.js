import { setup, won, row, koMoney } from "./common.js";
import { BROKERAGE_HOUSE, BROKERAGE_OFFICETEL, BROKERAGE_OTHER } from "./rates.js";

const pct = (r) => `${Math.round(r * 1000) / 10}%`;

// 월세는 보증금 + 월세 × 100, 그 합이 5천만 원 미만이면 보증금 + 월세 × 70 으로 거래금액을 잡는다.
export function dealAmount({ deal, price, rent }) {
  if (deal !== "monthly") return price;
  const a = price + rent * 100;
  return a < 5e7 ? price + rent * 70 : a;
}

export function brokerageFee({ deal, kind, price, rent }) {
  const amount = dealAmount({ deal, price, rent });
  const type = deal === "sale" ? "sale" : "lease";
  if (kind === "officetel") return { amount, rate: BROKERAGE_OFFICETEL[type], limit: null, fee: Math.floor(amount * BROKERAGE_OFFICETEL[type]) };
  if (kind === "other") return { amount, rate: BROKERAGE_OTHER, limit: null, fee: Math.floor(amount * BROKERAGE_OTHER) };
  const [, rate, limit] = BROKERAGE_HOUSE[type].find(([max]) => amount < max);
  const raw = Math.floor(amount * rate);
  return { amount, rate, limit: limit ?? null, fee: limit ? Math.min(raw, limit) : raw };
}

if (typeof document !== "undefined") {
  setup((v) => {
    if (!v.price) return `<p class="calc-empty">금액을 입력하면 바로 계산돼요.</p>`;
    const r = brokerageFee(v);
    const total = v.vat ? Math.floor(r.fee * 1.1) : r.fee;
    const limited = r.limit && r.fee === r.limit;
    return `
<div class="calc-headline"><span>중개보수 상한 (한쪽 기준)</span><strong>${won(total)}<small>원</small></strong><em>거래금액 ${koMoney(r.amount)} × ${pct(r.rate)}${limited ? ` (한도액 ${won(r.limit)}원 적용)` : ""}${v.vat ? " + 부가세 10%" : ""}</em></div>
<table class="calc-table">
  ${v.deal === "monthly" ? row("거래금액 (환산)", `${won(r.amount)}원`) : row("거래금액", `${won(r.amount)}원`)}
  ${row("상한요율", `${pct(r.rate)}${r.limit ? ` (한도 ${won(r.limit)}원)` : ""}`)}
  ${row("중개보수 상한", `${won(r.fee)}원`)}
  ${v.vat ? row("부가세 10%", `${won(total - r.fee)}원`) : ""}
  ${row("최대 낼 금액", `${won(total)}원`, "is-total")}
</table>
${v.deal === "monthly" ? `<p class="calc-tip">월세 거래금액 = 보증금 + 월세 × 100 = ${won(v.price + v.rent * 100)}원${v.price + v.rent * 100 < 5e7 ? `. 5천만 원 미만이라 월세 × 70으로 다시 계산했어요.` : "."}</p>` : ""}
${v.kind === "other" ? `<p class="calc-tip">주택이 아닌 중개대상물은 0.9% 안에서 중개사와 협의해 정해요. 0.9%는 최대치예요.</p>` : ""}
<p class="calc-note">상한요율은 법정 최대치이고, 그 안에서 협의해 낮출 수 있어요. 매도인·매수인(임대인·임차인)이 각각 냅니다. 중개사무소가 있는 시·도의 조례 요율을 따릅니다.</p>`;
  }, {
    onChange(form, v) {
      const label = form.querySelector("[data-label-sale]");
      label.textContent = label.dataset[`label${v.deal[0].toUpperCase()}${v.deal.slice(1)}`];
      form.querySelector("[data-show-monthly]").hidden = v.deal !== "monthly";
    },
  });
}
