// 근로시간 계산 규칙 (주휴수당·시급 변환 계산기가 함께 쓴다)

export const WEEKS_PER_MONTH = 365 / 7 / 12; // 약 4.345주

// 1주 소정근로시간이 15시간 이상이면 (주 근로시간 ÷ 40) × 8시간분을 받는다. 40시간을 넘어도 8시간까지다.
export function weeklyHolidayHours(weekHours) {
  if (weekHours < 15) return 0;
  return (Math.min(weekHours, 40) / 40) * 8;
}

// 월 환산 시간 = (1주 소정근로시간 + 주휴시간) × 4.345주, 정수로 반올림 (주 40시간 → 209시간)
export const monthlyHours = (week) => Math.round((Math.min(week, 40) + weeklyHolidayHours(week)) * WEEKS_PER_MONTH);
