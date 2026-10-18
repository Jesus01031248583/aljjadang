import { setup, won, row } from "./common.js";

const METHOD_NAME = { annuity: "원리금균등", principal: "원금균등", bullet: "만기일시" };

// 월 단위 상환 일정. 이자는 매달 남은 원금 × 연이율 ÷ 12 로 계산하고 원 단위로 반올림한다.
export function schedule({ amount, rate, months, grace, method }) {
  const r = rate / 100 / 12;
  const g = method === "bullet" ? 0 : Math.min(Math.max(Math.floor(grace), 0), months - 1);
  const pay = months - g;
  const annuity = r ? (amount * r) / (1 - (1 + r) ** -pay) : amount / pay;
  const rows = [];
  let balance = amount;
  for (let m = 1; m <= months; m++) {
    const interest = Math.round(balance * r);
    let principal = 0;
    if (method === "bullet") principal = m === months ? balance : 0;
    else if (m > g) {
      if (m === months) principal = balance;
      else if (method === "annuity") principal = Math.round(annuity) - interest;
      else principal = Math.round(amount / pay);
    }
    principal = Math.min(principal, balance);
    balance -= principal;
    rows.push({ m, principal, interest, payment: principal + interest, balance });
  }
  return rows;
}

const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);

if (typeof document !== "undefined") {
  setup((v) => {
    const months = Math.round(v.unit === "y" ? v.term * 12 : v.term);
    if (!v.amount || !months) return `<p class="calc-empty">대출금과 기간을 입력하면 바로 계산돼요.</p>`;
    if (months > 600) return `<p class="calc-empty">대출 기간은 50년(600개월)까지 계산할 수 있어요.</p>`;
    const opts = { amount: v.amount, rate: v.rate, months, grace: v.grace };
    const all = Object.fromEntries(Object.keys(METHOD_NAME).map((k) => [k, schedule({ ...opts, method: k })]));
    const rows = all[v.method];
    const interest = sum(rows, "interest");
    const g = v.method === "bullet" ? 0 : Math.min(Math.floor(v.grace), months - 1);
    const first = rows[g] || rows[0];
    const last = rows[rows.length - 1];
    let headline, sub;
    if (v.method === "annuity") { headline = first.payment; sub = g ? `거치 기간 ${g}개월은 매달 이자 ${won(rows[0].payment)}원만 내요` : "매달 같은 금액을 내요"; }
    else if (v.method === "principal") { headline = first.payment; sub = `첫 달 기준이고, 매달 줄어 마지막 달은 ${won(last.payment)}원이에요`; }
    else { headline = rows[0].payment; sub = `매달 이자만 내고, 마지막 달에 원금 ${won(v.amount)}원을 한 번에 갚아요`; }
    const compare = Object.entries(all).map(([k, rs]) => {
      const t = sum(rs, "interest");
      return `<tr class="${k === v.method ? "is-current" : ""}"><th scope="row">${METHOD_NAME[k]}</th><td>${won(t)}원</td></tr>`;
    }).join("");
    const table = rows.map((r) => `<tr><td>${r.m}</td><td>${won(r.payment)}</td><td>${won(r.principal)}</td><td>${won(r.interest)}</td><td>${won(r.balance)}</td></tr>`).join("");
    return `
<div class="calc-headline"><span>${v.method === "principal" ? "첫 달" : "월"} 상환액 (${METHOD_NAME[v.method]})</span><strong>${won(headline)}<small>원</small></strong><em>${sub}</em></div>
<table class="calc-table">
  ${row("대출 원금", `${won(v.amount)}원`)}
  ${row("총 이자", `${won(interest)}원`)}
  ${row("총 상환액", `${won(v.amount + interest)}원`, "is-total")}
</table>
<p class="calc-sub">상환 방식별 총 이자 비교</p>
<table class="calc-table">${compare}</table>
<details class="calc-schedule"><summary>월별 상환 일정 보기 (${months}회)</summary>
<div class="calc-scroll"><table><thead><tr><th>회차</th><th>상환액</th><th>원금</th><th>이자</th><th>남은 원금</th></tr></thead><tbody>${table}</tbody></table></div></details>
<p class="calc-note">월 단위로 계산한 값이에요. 은행은 실제 날짜 수로 이자를 계산하고 금리가 바뀌기도 해서 실제 금액과 조금 다를 수 있어요.</p>`;
  });
}
