import { describe, expect, it } from "vitest";
import { checkPassword, createSessionToken, SESSION_MAX_AGE, verifySessionToken } from "@/lib/auth";

describe("auth", () => {
  const now = Date.UTC(2026, 9, 4);

  it("발급한 토큰은 통과한다", () => {
    expect(verifySessionToken(createSessionToken("pw", now), "pw", now)).toBe(true);
  });

  it("비밀번호가 바뀌면 기존 토큰은 무효", () => {
    expect(verifySessionToken(createSessionToken("pw", now), "other", now)).toBe(false);
  });

  it("만료·변조·누락은 거절", () => {
    const token = createSessionToken("pw", now);
    expect(verifySessionToken(token, "pw", now + (SESSION_MAX_AGE + 1) * 1000)).toBe(false);
    const [exp, sig] = token.split(".");
    expect(verifySessionToken(`${Number(exp) + 999}.${sig}`, "pw", now)).toBe(false);
    expect(verifySessionToken(undefined, "pw", now)).toBe(false);
    expect(verifySessionToken(token, undefined, now)).toBe(false);
    expect(verifySessionToken("garbage", "pw", now)).toBe(false);
  });

  it("비밀번호 비교", () => {
    expect(checkPassword("pw", "pw")).toBe(true);
    expect(checkPassword("pw ", "pw")).toBe(false);
    expect(checkPassword("", "pw")).toBe(false);
  });
});
