# 문제 해결

## 새 프로젝트 생성

**New project 워크플로가 아예 안 돎 / job 이 skipped**
리포지토리가 템플릿으로 지정되지 않았다. Settings → General → Template repository.

**`BOOTSTRAP_PAT 시크릿이 없습니다`** — [SETUP.md](SETUP.md) 3번.

**초기화 push 가 `refusing to allow ... workflow` 로 실패**
`BOOTSTRAP_PAT` 에 `workflow` 스코프가 없다(템플릿 전용 워크플로를 지우는 커밋이라 필요).

**Provision 실패 — `project-scoped`**
`NEON_API_KEY` 가 project-scoped 키다. Personal 키로 바꾸고 같은 이름으로 재실행.

**Provision 은 성공인데 첫 Deploy 가 건너뜀**
Deploy 가 초기화 push 보다 먼저 돌았을 수 있다. 새 리포지토리에서
Actions → Deploy → Run workflow, 또는 같은 이름으로 New project 재실행.

**claude.ai/code 에 새 리포지토리가 안 보임**
Claude GitHub App 이 "Only select repositories" 로 설치돼 있다 → All repositories.

## PR / CI

**auto-fix 가 push 했는데 CI 가 다시 안 돎**
`GITHUB_TOKEN` 으로 push 한 커밋은 워크플로를 트리거하지 않는다. Claude GitHub App 을
설치하거나 `BOT_PAT` 을 넣는다.

**auto-fix 가 같은 걸 반복**
3회에서 멈춘다. 반복된다면 원인이 코드가 아니라 설정(시크릿, 한도)일 가능성이 크다.
그 PR 에서 끄려면 `no-autofix` 라벨.

**preview 가 건너뜀** — 프로비저닝 전이다(요약에 없는 값이 적혀 있다).

**preview 마이그레이션 실패** — 프로덕션 데이터에서 안 되는 마이그레이션이다(예: 기존 행이 있는데
NOT NULL 컬럼 추가). 좋은 신호다 — merge 전에 잡혔다. auto-fix 가 시도하고, 안 되면 `@claude` 로 지시.

**Neon 브랜치 한도 초과** — 열린 PR 이 많거나 정리가 안 됐다. Neon 콘솔에서 `preview/pr-*` 브랜치 삭제.

**프리뷰 링크가 로그인 화면** — Vercel 배포 보호(기본값). Vercel 에 로그인한 브라우저로 열면 된다.

## 배포

**Deploy 의 헬스체크 실패** — 배포는 됐지만 `/api/health` 가 200 이 아니다.
대부분 DB 연결 문제: Vercel 프로젝트 환경변수 `DATABASE_URL`(Production) 확인.

**되돌리기** — Vercel 대시보드 → Deployments → 이전 배포 → Instant Rollback.
DB 는 자동으로 되돌아가지 않는다. 되돌리는 마이그레이션을 새 PR 로.
Neon 은 시점 복구(PITR)도 된다(Free 는 보존 기간이 짧다).

**`이미 적용된 마이그레이션이 수정되었습니다`** — main 에 들어간 `.sql` 을 고쳤다.
원래대로 되돌리고 변경은 새 마이그레이션으로.
