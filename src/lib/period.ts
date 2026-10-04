// 날짜 경계는 한국 시간(Asia/Seoul) 기준이다.
// 일간: 매일 자정에 새 날. 주간: 일요일 자정(= 월요일 0시)에 새 주.
export const TIME_ZONE = "Asia/Seoul";

export type TaskKind = "daily" | "weekly";

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** now 시점의 한국 날짜를 YYYY-MM-DD 로. */
export function localDate(now: Date): string {
  return dateFormat.format(now);
}

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** date 가 속한 주의 월요일. */
export function weekStartOf(date: string): string {
  const day = toUtc(date).getUTCDay(); // 0 = 일요일
  return addDays(date, day === 0 ? -6 : 1 - day);
}

/** now 시점에 kind 할 일이 속하는 기간의 시작일. */
export function currentPeriod(kind: TaskKind, now: Date): string {
  const today = localDate(now);
  return kind === "daily" ? today : weekStartOf(today);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "10월 4일 (일)" */
export function formatDay(date: string): string {
  const d = toUtc(date);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`;
}

/** "9/28 – 10/4" */
export function formatWeek(weekStart: string): string {
  const s = toUtc(weekStart);
  const e = toUtc(addDays(weekStart, 6));
  return `${s.getUTCMonth() + 1}/${s.getUTCDate()} – ${e.getUTCMonth() + 1}/${e.getUTCDate()}`;
}

/** 이월 표시: 일간은 "n일째", 주간은 "n주째". 처음 기간이면 null. */
export function carryLabel(kind: TaskKind, firstPeriod: string, period: string): string | null {
  const days = daysBetween(firstPeriod, period);
  if (days <= 0) return null;
  return kind === "daily" ? `${days + 1}일째` : `${Math.round(days / 7) + 1}주째`;
}
