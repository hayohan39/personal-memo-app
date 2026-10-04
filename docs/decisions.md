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

## {{CREATED_AT}} 기본 스택

- 결정: Next.js(App Router) + TypeScript, Vercel 배포, Neon Postgres(`pg` + SQL 마이그레이션)
- 이유: project-bootstrap 템플릿의 고정 스택. 무료 한도 안에서 프로젝트를 계속 찍어낼 수 있다.
- 영향: merge = 프로덕션 배포. PR 마다 Neon 프리뷰 브랜치 + Vercel 프리뷰.
