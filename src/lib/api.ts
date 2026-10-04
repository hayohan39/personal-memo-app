import { cookies } from "next/headers";
import { getAppPassword, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// 라우트 핸들러 공통. proxy.ts 가 먼저 막지만 핸들러에서도 한 번 더 확인한다.

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const MAX_TEXT = 20_000;

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value, getAppPassword());
}

type Ctx<P> = { params: Promise<P> };

/** 인증·에러 처리를 감싼 라우트 핸들러. */
export function handler<P = Record<string, never>>(fn: (req: Request, params: P) => Promise<unknown>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      if (!(await isAuthenticated())) throw new HttpError(401, "로그인이 필요합니다.");
      const result = await fn(req, await ctx.params);
      return result === undefined ? new Response(null, { status: 204 }) : Response.json(result);
    } catch (error) {
      if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
      console.error(error);
      return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
  };
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "잘못된 id 입니다.");
  return id;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // 아래에서 처리
  }
  throw new HttpError(400, "JSON 본문이 필요합니다.");
}

/** 필수 텍스트. 공백만 있으면 거절한다. */
export function requireText(value: unknown, field = "text"): string {
  const text = optionalText(value, field);
  if (text === undefined || !text.trim()) throw new HttpError(400, `${field} 를 입력하세요.`);
  return text;
}

export function optionalText(value: unknown, field = "text"): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HttpError(400, `${field} 는 문자열이어야 합니다.`);
  if (value.length > MAX_TEXT) throw new HttpError(400, `${field} 가 너무 깁니다.`);
  return value;
}

export function notFound(found: unknown) {
  if (!found) throw new HttpError(404, "찾을 수 없습니다.");
}
