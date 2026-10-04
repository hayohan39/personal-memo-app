# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

[project-bootstrap](https://github.com/hayohan39/project-bootstrap) 으로 만든 프로젝트.

## 개발 흐름

1. **Claude 세션**(claude.ai/code, 웹·모바일)에서 이 리포지토리를 골라 만들고 싶은 것을 요청
2. Claude 가 브랜치 → 구현 → 커밋 → **PR** 생성
3. CI 자동 실행 → 실패하면 Claude 가 자동 수정 (최대 3회)
4. PR 에 프리뷰 링크(프로덕션 DB 복제본 사용)와 Claude 리뷰가 달림
5. **내가 리뷰 후 merge** → DB 마이그레이션 → Vercel 프로덕션 배포 → PR 에 결과 코멘트

수정이 필요하면 merge 대신 PR 에 `@claude <지시>` 코멘트.
진행 상황은 Claude 세션에서 "지금 상황 알려줘".

## 로컬 개발 (선택)

```bash
npm ci
echo 'DATABASE_URL=postgres://...' > .env.local   # 로컬 Postgres 또는 Neon 콘솔에서 만든 dev 브랜치
npm run dev
npm run check                # lint + typecheck + test + build
```

## 참고

- 결정 기록: [docs/decisions.md](docs/decisions.md)
- Claude 작업 규칙: [CLAUDE.md](CLAUDE.md)
- 헬스체크: `/api/health`
