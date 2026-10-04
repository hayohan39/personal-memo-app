# project-bootstrap

개인 미니 프로젝트(토이 프로젝트, 실험, 개인용 앱)를 위한 GitHub 템플릿.
새 프로젝트를 만들면 곧바로 이 흐름이 돌아간다:

```
나 ── Claude 세션(웹/모바일) ── "이거 만들어줘" / "지금 상황 어때?"
          │
          ▼
   Claude: 브랜치 → 구현 → npm run check → 커밋 → PR
          │
          ▼
   CI (자동) ─ lint · typecheck · test · 빈 DB 마이그레이션 · build
          │   └ 실패 → Claude auto-fix → 다시 CI (PR 당 최대 3회)
          ├ preview ─ Neon 브랜치(프로덕션 복제)에 마이그레이션 → Vercel 프리뷰 → PR 코멘트
          └ Claude 자동 리뷰 코멘트
          │
          ▼
나 ── GitHub 에서 PR 리뷰 → merge   (수정 요청은 @claude 코멘트)
          │
          ▼
   Deploy ─ 프로덕션 DB 마이그레이션 → Vercel 프로덕션 배포 → /api/health 확인 → PR 에 결과
```

| 고정 | 선택 (프로젝트 세션에서 결정 → `docs/decisions.md`) |
| --- | --- |
| Next.js + TypeScript, Vercel, Neon Postgres, GitHub Actions | 인증, 파일 저장소, 크론, 이메일, 외부 API, UI 라이브러리 … |

## 새 프로젝트 만들기

**Claude 세션에서** (이 리포지토리를 골라서):

> 새 프로젝트 만들어줘. 이름 `receipt-book`, 영수증 사진으로 가계부 쓰는 앱

Claude 가 `new-project` 워크플로를 실행한다. 또는 **GitHub 에서 직접**:
Actions → New project → Run workflow (`name`, `description`).

워크플로가 하는 일 (1~2분):

1. 이 템플릿으로 리포지토리 생성
2. 공통 시크릿 복사 (Claude · Vercel · Neon 토큰)
3. Neon 프로젝트 생성 → Vercel 프로젝트 생성 → `DATABASE_URL` 연결
4. 이름/설명 채우고 템플릿 전용 파일 제거 후 push → 첫 프로덕션 배포

그 다음 claude.ai/code 에서 새 리포지토리로 세션을 열고 개발을 요청하면 된다.

> 같은 이름으로 다시 실행하면 이미 된 것은 재사용하고 빠진 것만 채운다(프로비저닝 실패 복구용).

## 처음 한 번

[docs/bootstrap/SETUP.md](docs/bootstrap/SETUP.md) — 템플릿 지정, Claude GitHub App, 시크릿 5개.

## 들어 있는 것

```
.github/workflows/
  ci.yml               test → preview → autofix
  preview-cleanup.yml  PR 닫히면 Neon 프리뷰 브랜치 삭제
  deploy.yml           main → 마이그레이션 → Vercel 배포 → 헬스체크
  claude-review.yml    PR 자동 리뷰
  claude-mention.yml   @claude 코멘트 처리
  new-project.yml      [템플릿 전용] 새 프로젝트 생성
.claude/
  settings.json        권한 allowlist, .env 읽기 금지, 세션 시작 시 npm ci
  skills/project-status  "개발 현황" 보고 절차
  skills/new-project     [템플릿 전용] 새 프로젝트 생성 절차
CLAUDE.md              Claude 의 작업 규칙 (브랜치·PR·DB·인프라 결정)
src/                   Next.js 앱 (상태 페이지, /api/health, pg 헬퍼)
migrations/            *.sql — 파일명 순서대로, 파일당 트랜잭션, 체크섬 검사
scripts/
  migrate.mjs          마이그레이션 러너
  neon.mjs             PR 프리뷰 브랜치 생성/삭제
  gh.mjs               REST 전용 GitHub 헬퍼 (클라우드 세션은 GraphQL 차단 → gh pr 불가)
  provision.mjs        [템플릿 전용] Neon + Vercel 프로젝트 생성
  init-project.mjs     [템플릿 전용] 플레이스홀더 치환
docs/decisions.md      프로젝트별 결정 기록
```

## 더 보기

- [docs/bootstrap/SETUP.md](docs/bootstrap/SETUP.md) — 최초 설정, 무료 한도
- [docs/bootstrap/MAINTAINING.md](docs/bootstrap/MAINTAINING.md) — 템플릿 고치는 법
- [docs/bootstrap/DESIGN.md](docs/bootstrap/DESIGN.md) — 설계 근거 (클라우드 세션 제약, Neon 선택, 배포 순서)
- [docs/bootstrap/TROUBLESHOOTING.md](docs/bootstrap/TROUBLESHOOTING.md) — 증상별 해결
