import { NextResponse, type NextRequest } from "next/server";
import { getAppPassword, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// 로그인하지 않은 요청은 /login 으로 보낸다(API 는 401).
export function proxy(request: NextRequest) {
  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, getAppPassword())) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    // 로그인 페이지, 헬스 체크, 정적 파일, 아이콘/매니페스트는 공개.
    "/((?!login|api/health|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)",
  ],
};
