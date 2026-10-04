import { describe, expect, it } from "vitest";
import { carryLabel, currentPeriod, formatDay, formatWeek, localDate, weekStartOf } from "@/lib/period";

describe("period", () => {
  it("한국 시간 자정을 날짜 경계로 쓴다", () => {
    // 2026-10-04 14:59Z = 23:59 KST, 15:00Z = 다음날 00:00 KST
    expect(localDate(new Date("2026-10-04T14:59:59Z"))).toBe("2026-10-04");
    expect(localDate(new Date("2026-10-04T15:00:00Z"))).toBe("2026-10-05");
  });

  it("주는 월요일에 시작한다(일요일 자정이 경계)", () => {
    expect(weekStartOf("2026-10-04")).toBe("2026-09-28"); // 일요일 → 그 주 월요일
    expect(weekStartOf("2026-10-05")).toBe("2026-10-05"); // 월요일
    expect(weekStartOf("2026-10-07")).toBe("2026-10-05");
    // 일요일 23:59 KST 는 아직 지난 주, 월요일 0시부터 새 주
    expect(currentPeriod("weekly", new Date("2026-10-04T14:59:59Z"))).toBe("2026-09-28");
    expect(currentPeriod("weekly", new Date("2026-10-04T15:00:00Z"))).toBe("2026-10-05");
  });

  it("월·연 경계를 넘는다", () => {
    expect(weekStartOf("2027-01-01")).toBe("2026-12-28");
  });

  it("이월 표시", () => {
    expect(carryLabel("daily", "2026-10-04", "2026-10-04")).toBeNull();
    expect(carryLabel("daily", "2026-10-03", "2026-10-04")).toBe("2일째");
    expect(carryLabel("weekly", "2026-09-21", "2026-10-05")).toBe("3주째");
  });

  it("표시 형식", () => {
    expect(formatDay("2026-10-04")).toBe("10월 4일 (일)");
    expect(formatWeek("2026-09-28")).toBe("9/28 – 10/4");
  });
});
