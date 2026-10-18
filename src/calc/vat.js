import { setup, won, floor10, row } from "./common.js";
import { VAT_SIMPLIFIED_RATES, VAT_CARD_CREDIT } from "./rates.js";

const cardCredit = (card, tax) => Math.min(Math.floor(card * VAT_CARD_CREDIT.rate), VAT_CARD_CREDIT.limit, Math.max(0, tax));

export function generalVat({ sales, buys, card }) {
  const out = Math.floor(sales * 0.1), input = Math.floor(buys * 0.1);
  const before = out - input;
  const credit = cardCredit(card, before);
  return { out, input, before, credit, pay: before - credit };
}

// 간이과세자: 공급대가 × 업종별 부가가치율 × 10% − 매입 공급대가 × 0.5% − 카드 공제. 공제는 납부세액을 넘지 못하고 환급은 없다.
export function simplifiedVat({ ssales, sbuys, industry, card }) {
  const rate = VAT_SIMPLIFIED_RATES[Number(industry)]?.[1] ?? 0.15;
  const tax = Math.floor(ssales * rate * 0.1);
  const buyCredit = Math.min(Math.floor(sbuys * 0.005), tax);
  const credit = cardCredit(card, tax - buyCredit);
  const exempt = ssales < 48e6;
  return { rate, tax, buyCredit, credit, pay: exempt ? 0 : floor10(tax - buyCredit - credit), exempt };
}

if (typeof document !== "undefined") {
  const sel = document.querySelector("#f-industry");
  sel.innerHTML = VAT_SIMPLIFIED_RATES.map(([name, r], i) => `<option value="${i}">${name} (${Math.round(r * 100)}%)</option>`).join("");

  setup((v) => {
    if (v.mode === "price") {
      if (!v.amount) return `<p class="calc-empty">금액을 입력하면 바로 계산돼요.</p>`;
      const supply = v.base === "supply" ? v.amount : Math.round(v.amount / 1.1);
      const vat = v.base === "supply" ? Math.floor(v.amount * 0.1) : v.amount - supply;
      return `
<div class="calc-headline"><span>${v.base === "supply" ? "합계 (VAT 포함)" : "공급가액 (VAT 별도)"}</span><strong>${won(v.base === "supply" ? supply + vat : supply)}<small>원</small></strong><em>부가세 ${won(vat)}원</em></div>
<table class="calc-table">
  ${row("공급가액", `${won(supply)}원`)}
  ${row("부가세 (10%)", `${won(vat)}원`)}
  ${row("합계", `${won(supply + vat)}원`, "is-total")}
</table>
<p class="calc-note">합계에서 공급가액을 구할 때는 합계 ÷ 1.1을 반올림하고, 나머지를 부가세로 봤어요. 세금계산서 작성 방식에 따라 1원 차이가 날 수 있어요.</p>`;
    }
    if (v.mode === "general") {
      if (!v.sales) return `<p class="calc-empty">매출 공급가액을 입력하면 바로 계산돼요.</p>`;
      const r = generalVat(v);
      const refund = r.pay < 0;
      return `
<div class="calc-headline"><span>${refund ? "환급 예상액" : "납부 예상 부가세"}</span><strong>${won(Math.abs(r.pay))}<small>원</small></strong><em>매출세액 ${won(r.out)}원 − 매입세액 ${won(r.input)}원${r.credit ? ` − 카드 공제 ${won(r.credit)}원` : ""}</em></div>
<table class="calc-table">
  ${row("매출세액 (매출의 10%)", `${won(r.out)}원`)}
  ${row("매입세액 (매입의 10%)", `− ${won(r.input)}원`)}
  ${row("신용카드 등 발행세액공제 (1.3%)", `− ${won(r.credit)}원`)}
  ${row(refund ? "환급 예상액" : "납부할 세액", `${won(Math.abs(r.pay))}원`, "is-total")}
</table>
<p class="calc-note">신고 기간(1~6월, 7~12월) 단위로 넣으세요. 예정고지로 미리 낸 세액이 있으면 그만큼 빼고 냅니다. 카드 공제는 2026년 말까지 1.3%, 연 1,000만 원 한도예요.</p>`;
    }
    if (!v.ssales) return `<p class="calc-empty">1년 매출을 입력하면 바로 계산돼요.</p>`;
    const r = simplifiedVat(v);
    return `
<div class="calc-headline"><span>납부 예상 부가세 (1년)</span><strong>${won(r.pay)}<small>원</small></strong><em>${r.exempt ? "연 매출 4,800만 원 미만이라 납부가 면제돼요" : `매출 × 부가가치율 ${Math.round(r.rate * 100)}% × 10% − 공제`}</em></div>
<table class="calc-table">
  ${row(`납부세액 (매출 × ${Math.round(r.rate * 100)}% × 10%)`, `${won(r.tax)}원`)}
  ${row("매입 공제 (매입의 0.5%)", `− ${won(r.buyCredit)}원`)}
  ${row("신용카드 등 발행세액공제 (1.3%)", `− ${won(r.credit)}원`)}
  ${row("낼 세금", `${won(r.pay)}원`, "is-total")}
</table>
${r.exempt ? `<p class="calc-tip">납부는 면제되지만 신고는 다음 해 1월 25일까지 꼭 해야 해요.</p>` : ""}
${v.ssales >= 104e6 ? `<p class="calc-warn">연 매출(공급대가)이 1억 400만 원 이상이면 다음 해 7월부터 일반과세자로 바뀌어요.</p>` : ""}
<p class="calc-note">간이과세자는 공제액이 납부세액보다 많아도 환급되지 않아요. 카드 공제는 2026년 말까지 1.3%, 연 1,000만 원 한도예요.</p>`;
  }, {
    stale: (v) => (v.mode === "price" ? [] : ["cardCredit"]),
    onChange(form, v) {
      for (const el of form.querySelectorAll("[data-mode]")) el.hidden = el.dataset.mode !== v.mode;
      form.querySelector("[data-mode-not]").hidden = v.mode === "price";
    },
  });
}
