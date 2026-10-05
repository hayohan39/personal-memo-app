"use client";

import { useState } from "react";
import { addDays, weekStartOf } from "@/lib/period";

type Props = { today: string; weekStart: string };

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

/** 한 달 달력(월요일 시작). 오늘과 이번 주를 강조한다. 표시 전용. */
export function MonthCalendar({ today, weekStart }: Props) {
  const [offset, setOffset] = useState(0); // 이번 달 기준 몇 달 이동했는지
  const [ty, tm] = today.split("-").map(Number);
  const first = new Date(Date.UTC(ty, tm - 1 + offset, 1));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth(); // 0-11
  const firstDate = first.toISOString().slice(0, 10);
  const weekEnd = addDays(weekStart, 6);

  // 첫 주 월요일부터 마지막 날이 든 주의 일요일까지
  const start = weekStartOf(firstDate);
  const lastDate = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  const end = addDays(weekStartOf(lastDate), 6);
  const weeks: string[][] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  }

  return (
    <section className="card calendar" aria-label="달력">
      <header className="cal-head">
        <button type="button" className="icon-btn" aria-label="이전 달" onClick={() => setOffset((o) => o - 1)}>
          ‹
        </button>
        <h2>
          {year}년 {month + 1}월
        </h2>
        <button type="button" className="icon-btn" aria-label="다음 달" onClick={() => setOffset((o) => o + 1)}>
          ›
        </button>
        {offset !== 0 ? (
          <button type="button" className="link small" onClick={() => setOffset(0)}>
            오늘
          </button>
        ) : null}
      </header>
      <table className="cal-grid">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((days) => {
            const thisWeek = days[0] === weekStart;
            return (
              <tr key={days[0]} className={thisWeek ? "this-week" : undefined}>
                {days.map((d) => {
                  const classes = [
                    Number(d.slice(5, 7)) !== month + 1 ? "other" : "",
                    d === today ? "today" : "",
                    d >= weekStart && d <= weekEnd ? "in-week" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <td key={d} className={classes || undefined} aria-current={d === today ? "date" : undefined}>
                      <span>{Number(d.slice(8))}</span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
