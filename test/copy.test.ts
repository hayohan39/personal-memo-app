import { describe, expect, it } from "vitest";
import { formatBlock } from "@/lib/copy";

describe("formatBlock", () => {
  it("항목이 하나면 번호 없이", () => {
    expect(formatBlock(["로그인 버그 고쳐줘"])).toBe("로그인 버그 고쳐줘");
  });

  it("여러 개면 번호 목록", () => {
    expect(formatBlock(["다크 모드", "알림 끄기"])).toBe("1. 다크 모드\n2. 알림 끄기");
  });

  it("여러 줄 항목은 들여쓰기를 맞춘다", () => {
    expect(formatBlock(["첫째\n세부", "둘째"])).toBe("1. 첫째\n   세부\n2. 둘째");
  });

  it("빈 항목은 뺀다", () => {
    expect(formatBlock(["", "  하나 "])).toBe("하나");
  });
});

describe("formatBlock 앞뒤 문구", () => {
  it("앞·뒤 문구를 빈 줄로 띄워 붙인다", () => {
    expect(formatBlock(["a", "b"], { prefix: "지시\n설명 ", suffix: " 추가 요청" })).toBe(
      "지시\n설명\n\n1. a\n2. b\n\n추가 요청",
    );
  });

  it("비어 있는 쪽은 빼고 붙인다", () => {
    expect(formatBlock(["a"], { prefix: "", suffix: "끝" })).toBe("a\n\n끝");
    expect(formatBlock(["a"], { prefix: "  ", suffix: "" })).toBe("a");
  });

  it("항목이 없으면 문구만", () => {
    expect(formatBlock([], { prefix: "앞", suffix: "뒤" })).toBe("앞\n\n뒤");
  });
});
