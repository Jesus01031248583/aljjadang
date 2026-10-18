import { setup, won, floor10, row, todayKST } from "./common.js";
import { CAR_TAX, CAR_TAX_PREPAY_RATE } from "./rates.js";

const DAY = 864e5;
const days = (y, m1, d1, m2, d2) => Math.round((Date.UTC(y, m2 - 1, d2) - Date.UTC(y, m1 - 1, d1)) / DAY) + 1;

// 연세액: 배기량 × cc당 세액 (구간별 누진이 아니라 해당 구간 단가를 전체 배기량에 곱한다)
export function annualBase({ fuel, cc }) {
  if (fuel === "ev") return CAR_TAX.electric;
  const [, perCc] = CAR_TAX.perCc.find(([max]) => cc <= max);
  return Math.floor(cc) * perCc;
}

// 차령 (지방세법 시행령 제122조): 1~6월 등록이면 과세연도 - 등록연도 + 1, 7~12월 등록이면 1기분은 1년 적게 센다.
export function carAge(regYear, regMonth, year) {
  const n2 = year - regYear + 1;
  return { n1: regMonth <= 6 ? n2 : n2 - 1, n2 };
}

// 기분세액 = A/2 - (A/2 × 5%) × (차령 - 2), 차령 3년부터 경감, 12년 넘으면 12년으로 본다 (최대 50%)
const halfTax = (A, n) => floor10(A / 2 - (A / 2) * 0.05 * (Math.min(Math.max(n, 2), 12) - 2));

export function carTax({ fuel, cc, reg, year, prepay }) {
  const y = Number(year);
  const A = annualBase({ fuel, cc });
  let h1 = A / 2, h2 = A / 2, n1 = null, n2 = null;
  if (fuel !== "ev") {
    const [ry, rm] = reg.split("-").map(Number);
    ({ n1, n2 } = carAge(ry, rm, y));
    h1 = halfTax(A, n1);
    h2 = halfTax(A, n2);
  }
  // 연납 공제: 납부기한 다음 날부터 12월 31일까지에 해당하는 세액 × 5%
  const H1 = days(y, 1, 1, 6, 30), H2 = days(y, 7, 1, 12, 31);
  const remain = {
    1: h1 * days(y, 2, 1, 6, 30) / H1 + h2,
    3: h1 * days(y, 4, 1, 6, 30) / H1 + h2,
    6: h2,
    9: h2 * days(y, 10, 1, 12, 31) / H2,
  }[prepay] ?? 0;
  const discount = floor10(remain * CAR_TAX_PREPAY_RATE);
  const tax = h1 + h2 - discount;
  const edu = floor10(tax * CAR_TAX.education);
  const eduFull = floor10((h1 + h2) * CAR_TAX.education);
  return { A, n1, n2, h1, h2, discount, tax, edu, total: tax + edu, fullTotal: h1 + h2 + eduFull };
}

if (typeof document !== "undefined") {
  const today = todayKST();
  const thisYear = Number(today.slice(0, 4));
  const yearSel = document.querySelector("[data-years]");
  const defYear = Number(today.slice(5, 7)) >= 10 ? thisYear + 1 : thisYear;
  yearSel.innerHTML = [thisYear, thisYear + 1].map((y) => `<option value="${y}"${y === defYear ? " selected" : ""}>${y}년</option>`).join("");

  setup((v) => {
    if (v.fuel !== "ev" && !v.cc) return `<p class="calc-empty">배기량을 입력하면 바로 계산돼요.</p>`;
    if (v.fuel !== "ev" && !/^\d{4}-\d{2}$/.test(v.reg)) return `<p class="calc-empty">최초 등록 연월을 입력해 주세요.</p>`;
    const r = carTax(v);
    const y = Number(v.year);
    if (v.fuel !== "ev" && r.n2 < 1) return `<p class="calc-empty">세금 낼 연도가 최초 등록 연도보다 앞서요.</p>`;
    const firstYear = v.fuel !== "ev" && Number(v.reg.slice(0, 4)) === y;
    const cut = r.n2 != null ? Math.min(Math.max(r.n2, 2), 12) - 2 : 0;
    return `
<div class="calc-headline"><span>${y}년 자동차세 (지방교육세 포함)</span><strong>${won(r.total)}<small>원</small></strong><em>${v.prepay === "none" ? "6월·12월에 반씩 나눠 내요" : `${v.prepay}월 연납 시 · 나눠 낼 때보다 ${won(r.fullTotal - r.total)}원 적어요`}</em></div>
<table class="calc-table">
  ${row("기본 연세액", v.fuel === "ev" ? `${won(r.A)}원 (정액)` : `${won(r.A)}원 (${won(v.cc)}cc × ${won(r.A / Math.floor(v.cc))}원)`)}
  ${r.n2 != null ? row("차령 · 경감률", `${r.n1 === r.n2 ? `${r.n2}년` : `1기 ${r.n1}년 · 2기 ${r.n2}년`} · ${cut * 5}%${r.n2 >= 12 ? " (최대)" : ""}`) : ""}
  ${row("1기분 (6월)", `${won(r.h1)}원`)}
  ${row("2기분 (12월)", `${won(r.h2)}원`)}
  ${v.prepay !== "none" ? row("연납 공제", `− ${won(r.discount)}원`) : ""}
  ${row("자동차세", `${won(r.tax)}원`)}
  ${row("지방교육세 (30%)", `${won(r.edu)}원`)}
  ${row("합계", `${won(r.total)}원`, "is-total")}
</table>
${firstYear ? `<p class="calc-warn">처음 등록한 해에는 등록일부터 일할 계산해서 실제 세액이 이보다 적어요.</p>` : ""}
${v.fuel !== "ev" && v.cc > 1000 && v.cc <= 1050 ? `<p class="calc-tip">1,000cc를 조금 넘으면 cc당 세액이 80원에서 140원으로 올라가요.</p>` : ""}
<p class="calc-note">비영업용 승용차 표준세율 기준이에요. 차령이 3년이 되는 해부터 매년 5%씩, 최대 50%까지 줄어들어요. 연납은 남은 기간 세액의 5%를 빼 주는 방식이라 늦게 낼수록 할인이 줄어요.</p>`;
  }, {
    onChange(form, v) {
      for (const el of form.querySelectorAll("[data-show-ice]")) el.hidden = v.fuel === "ev";
    },
  });
}
