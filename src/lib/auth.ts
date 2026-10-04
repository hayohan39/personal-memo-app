import { createHmac, timingSafeEqual } from "node:crypto";

// 개인용 앱이라 비밀번호 하나(APP_PASSWORD)로 로그인한다.
// 세션 쿠키는 "만료시각.서명" 이고, 서명 키가 비밀번호에서 나오므로
// 비밀번호를 바꾸면 기존 세션은 모두 무효가 된다.
export const SESSION_COOKIE = "memo_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1년

export function getAppPassword(): string | undefined {
  return process.env.APP_PASSWORD || undefined;
}

function sign(payload: string, password: string): string {
  return createHmac("sha256", `memo-session:${password}`).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function createSessionToken(password: string, now = Date.now()): string {
  const exp = String(Math.floor(now / 1000) + SESSION_MAX_AGE);
  return `${exp}.${sign(exp, password)}`;
}

export function verifySessionToken(
  token: string | undefined,
  password: string | undefined,
  now = Date.now(),
): boolean {
  if (!token || !password) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 < now) return false;
  return safeEqual(sig, sign(exp, password));
}

export function checkPassword(input: string, password: string): boolean {
  // 길이 차이로 새지 않도록 둘 다 해시해서 비교한다.
  const h = (s: string) => createHmac("sha256", "memo-password").update(s).digest();
  return timingSafeEqual(h(input), h(password));
}
