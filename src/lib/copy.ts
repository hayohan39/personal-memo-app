/** 새 프로젝트의 뒤 문구(추가 요청) 기본값. DB 컬럼 기본값과 같아야 한다(마이그레이션 default-suffix). */
export const DEFAULT_SUFFIX = "애매한 사항이나 반드시 확인해야될 게 있으면 꼭 물어봐";

/**
 * 블록을 세션에 붙여넣을 텍스트로 만든다.
 * 항목이 하나면 그대로, 여러 개면 번호를 붙인다.
 * wrap 을 주면 프로젝트의 앞(지시 설명)·뒤(추가 요청) 문구를 빈 줄로 띄워 앞뒤에 붙인다.
 */
export function formatBlock(items: string[], wrap?: { prefix: string; suffix: string }): string {
  const texts = items.map((t) => t.trim()).filter(Boolean);
  const body =
    texts.length === 1
      ? texts[0]
      : texts.map((t, i) => `${i + 1}. ${t.replace(/\n/g, "\n   ")}`).join("\n");
  return [wrap?.prefix.trim(), body, wrap?.suffix.trim()].filter(Boolean).join("\n\n");
}
