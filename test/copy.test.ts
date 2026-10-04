import { describe, expect, it } from "vitest";
import { formatBlock } from "@/lib/copy";

describe("formatBlock", () => {
  it("항목이 하나면 번호 없이", () => {
    expect(formatBlock("", ["로그인 버그 고쳐줘"])).toBe("로그인 버그 고쳐줘");
  });

  it("여러 개면 번호 목록, 제목은 맨 위", () => {
    expect(formatBlock("설정 화면", ["다크 모드", "알림 끄기"])).toBe("설정 화면\n\n1. 다크 모드\n2. 알림 끄기");
  });

  it("여러 줄 항목은 들여쓰기를 맞춘다", () => {
    expect(formatBlock("", ["첫째\n세부", "둘째"])).toBe("1. 첫째\n   세부\n2. 둘째");
  });

  it("빈 항목은 뺀다", () => {
    expect(formatBlock(" ", ["", "  하나 "])).toBe("하나");
  });
});
