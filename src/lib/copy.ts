/**
 * 블록을 세션에 붙여넣을 텍스트로 만든다.
 * 항목이 하나면 그대로, 여러 개면 번호를 붙인다. 제목이 있으면 맨 위에 둔다.
 */
export function formatBlock(title: string, items: string[]): string {
  const texts = items.map((t) => t.trim()).filter(Boolean);
  const body =
    texts.length === 1
      ? texts[0]
      : texts.map((t, i) => `${i + 1}. ${t.replace(/\n/g, "\n   ")}`).join("\n");
  const head = title.trim();
  return head ? (body ? `${head}\n\n${body}` : head) : body;
}
