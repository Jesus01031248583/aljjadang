import { setup, won, row } from "./common.js";
import { BASE_RATE, JEONSE_CONVERSION_CAP as CAP } from "./rates.js";

const pct = (n) => `${Math.round(n * 100) / 100}%`;

if (typeof document !== "undefined") {
  const conv = document.querySelector("[data-default-conv]");
  if (!conv.value) conv.value = String(CAP);
  document.querySelector("[data-conv-hint]").textContent =
    `기존 계약을 바꿀 때 법정 상한은 연 ${CAP}%예요 (기준금리 ${BASE_RATE.rate}% + 2%).`;

  setup((v) => {
    if (v.mode === "rate") {
      const dDep = v.adep - v.bdep, dRent = v.brent - v.arent;
      if (!dDep || !dRent || Math.sign(dDep) !== Math.sign(dRent)) {
        return `<p class="calc-empty">한쪽은 보증금이 많고 월세가 적게, 다른 쪽은 보증금이 적고 월세가 많게 넣어 주세요.</p>`;
      }
      const rate = (dRent * 12) / dDep * 100;
      const yearlyRent = Math.abs(dRent) * 12;
      const loanCost = v.loan ? Math.abs(dDep) * v.loan / 100 : 0;
      const moreDep = dDep > 0 ? "A" : "B";
      let verdict = "";
      if (v.loan) {
        verdict = loanCost < yearlyRent
          ? `보증금 차이 ${won(Math.abs(dDep))}원을 연 ${v.loan}%로 빌리면 이자가 1년에 ${won(loanCost)}원이라, 월세 차이(1년 ${won(yearlyRent)}원)보다 적어요. 보증금이 많은 조건 ${moreDep}가 유리해요.`
          : `보증금 차이 ${won(Math.abs(dDep))}원을 연 ${v.loan}%로 빌리면 이자가 1년에 ${won(loanCost)}원이라, 월세 차이(1년 ${won(yearlyRent)}원)보다 많아요. 월세가 많은 쪽이 오히려 유리해요.`;
      }
      return `
<div class="calc-headline"><span>두 조건의 전환율</span><strong>${pct(rate)}</strong><em>보증금 ${won(Math.abs(dDep))}원 차이를 월세 ${won(Math.abs(dRent))}원으로 바꾼 셈이에요</em></div>
<table class="calc-table">
  ${row("보증금 차이", `${won(Math.abs(dDep))}원`)}
  ${row("월세 차이 (1년)", `${won(yearlyRent)}원`)}
  ${row("법정 전환율 상한", `연 ${CAP}%`)}
</table>
${verdict ? `<p class="calc-tip">${verdict}</p>` : ""}
${rate > CAP ? `<p class="calc-warn">전환율이 법정 상한(연 ${CAP}%)보다 높아요. 이미 살고 있는 집의 계약을 이 조건으로 바꾸는 거라면 상한을 넘는 월세는 받을 수 없어요. 새로 맺는 계약에는 상한이 적용되지 않아요.</p>` : ""}`;
    }
    if (!v.dep) return `<p class="calc-empty">지금 보증금을 입력하면 바로 계산돼요.</p>`;
    if (!v.conv) return `<p class="calc-empty">전환율을 입력해 주세요.</p>`;
    const diff = v.dep - v.newdep;
    const change = Math.round((diff * v.conv) / 100 / 12);
    const newRent = Math.max(0, v.rent + change);
    const capRent = v.rent + Math.round((diff * CAP) / 100 / 12);
    const down = diff < 0;
    return `
<div class="calc-headline"><span>바꾼 뒤 월세</span><strong>${won(newRent)}<small>원</small></strong><em>보증금 ${won(Math.abs(diff))}원 ${down ? "올리고 월세 " + won(-change) + "원 내림" : "내리고 월세 " + won(change) + "원 올림"} · 전환율 연 ${v.conv}%</em></div>
<table class="calc-table">
  ${row("보증금", `${won(v.dep)}원 → ${won(v.newdep)}원`)}
  ${row("월세", `${won(v.rent)}원 → ${won(newRent)}원`, "is-total")}
  ${row("1년 월세 합계", `${won(newRent * 12)}원`)}
</table>
${!down && v.conv > CAP ? `<p class="calc-warn">입력한 전환율이 법정 상한(연 ${CAP}%)보다 높아요. 계약 기간 중이거나 갱신하면서 보증금을 월세로 바꾸면 월세는 최대 ${won(capRent)}원까지만 받을 수 있어요.</p>` : ""}
${down ? `<p class="calc-tip">보증금을 올리고 월세를 줄이는 쪽은 법정 상한이 없어서 집주인과 협의해 정해요.</p>` : ""}
<p class="calc-note">월세 = 지금 월세 + (줄어든 보증금 × 전환율 ÷ 12). 기준금리는 ${Number(BASE_RATE.since.slice(0, 4))}년 ${Number(BASE_RATE.since.slice(5, 7))}월 ${Number(BASE_RATE.since.slice(8))}일부터 연 ${BASE_RATE.rate.toFixed(2)}%예요.</p>`;
  }, {
    onChange(form, v) {
      for (const el of form.querySelectorAll("[data-mode]")) el.hidden = el.dataset.mode !== v.mode;
    },
  });
}
