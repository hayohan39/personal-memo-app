"use client";

/** JSON API 호출. 실패하면 서버가 준 메시지로 에러를 던진다. 401 이면 로그인으로 보낸다. */
export async function api<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 401) {
    // 세션이 끝났으면 화면 상태를 버리고 로그인부터 다시 한다.
    window.location.replace("/login");
    throw new Error("로그인이 필요합니다.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `요청 실패 (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // http 나 권한 문제로 실패하면 예전 방식으로
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  el.remove();
}

/** textarea 높이를 내용에 맞춘다. */
export function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
