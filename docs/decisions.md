# 결정 기록

이 프로젝트에서 내린 기술·인프라 결정을 남긴다. Claude 와 세션에서 합의한 것도 여기에 적는다.
최신 항목이 위로 온다.

형식:

```
## YYYY-MM-DD 제목
- 결정:
- 이유:
- 검토한 대안:
- 영향: (새 환경변수, 비용, 되돌리는 법)
```

## 미결

- (없음)

---

## 2026-10-04 인증: 비밀번호 하나(APP_PASSWORD)

- 결정: 환경변수 `APP_PASSWORD` 하나로 로그인하고, HMAC 서명 쿠키(httpOnly, 1년)로 세션을 유지한다.
  `src/proxy.ts` 가 로그인 안 한 요청을 `/login`(API 는 401)으로 보낸다. `/api/health` 만 공개.
- 이유: 혼자 쓰는 앱이라 계정 체계가 필요 없다. 무료이고 외부 서비스·추가 설정이 없다.
- 검토한 대안: GitHub 로그인(Auth.js, OAuth 앱 등록 + 환경변수 3~4개), Clerk(외부 서비스 락인).
- 영향: Vercel 환경변수 `APP_PASSWORD`(Production, Preview) 필요. 비밀번호를 바꾸면 모든 기기에서 로그아웃된다.

## 2026-10-04 할 일 이월은 조회 시점에 처리

- 결정: 크론 없이, 할 일을 불러올 때 지난 기간의 미완료 항목을 현재 기간으로 옮긴다.
  기준은 한국 시간(Asia/Seoul) — 일간은 매일 0시, 주간은 월요일 0시(일요일 자정).
- 이유: 화면에 보이는 결과는 자정 크론과 같고, Vercel Cron 설정·실패 처리가 필요 없다.
- 검토한 대안: Vercel Cron(무료 플랜은 하루 1회, 시간 정밀도 낮음).
- 영향: 없음. 시간대를 바꾸려면 `src/lib/period.ts` 의 `TIME_ZONE`.

## 2026-10-04 기본 스택

- 결정: Next.js(App Router) + TypeScript, Vercel 배포, Neon Postgres(`pg` + SQL 마이그레이션)
- 이유: project-bootstrap 템플릿의 고정 스택. 무료 한도 안에서 프로젝트를 계속 찍어낼 수 있다.
- 영향: merge = 프로덕션 배포. PR 마다 Neon 프리뷰 브랜치 + Vercel 프리뷰.
