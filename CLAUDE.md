@AGENTS.md

<!-- template-only:start -->
> **여기는 템플릿 리포지토리(project-bootstrap)다.** 아래 내용은 이 템플릿으로 만든
> 프로젝트용이다. 템플릿 자체를 고칠 때는 `docs/bootstrap/MAINTAINING.md` 를 먼저 읽는다.
> 새 프로젝트를 만들어 달라는 요청이면 `new-project` 스킬을 따른다.
<!-- template-only:end -->

# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

개인 미니 프로젝트다. 리포지토리 주인(이하 "사용자")은 Claude 세션에서 개발을 요청하고
진행 상황을 묻고, GitHub 에서 PR 을 리뷰해 merge 한다. 커밋과 PR 은 Claude 가 만든다.

## 역할 분담

| 누가 | 무엇을 |
| --- | --- |
| 사용자 | Claude 세션에서 요청 · PR 리뷰 · **merge** (merge 는 항상 사용자가 한다) |
| Claude (세션) | 브랜치 → 구현 → 로컬 검증 → 커밋 → push → **PR 생성** → CI 결과 확인 |
| GitHub Actions | CI(자동) · CI 실패 시 auto-fix · PR 프리뷰 · merge 후 마이그레이션+배포 |

## 개발 요청을 받으면

1. **main 에서 새 브랜치**를 딴다: `claude/<짧은-설명>` (세션이 브랜치를 정해 줬으면 그걸 쓴다).
   `git fetch origin main` 후 최신 main 기준으로 시작한다.
2. 요청이 모호하거나 **인프라/비용/외부 서비스가 새로 필요한** 결정이면 구현 전에 먼저
   묻는다(아래 "인프라 결정" 참고). 그 외에는 합리적으로 판단해 진행하고 PR 에 적는다.
3. 구현한다. 한 PR 에 한 목적. 무관한 리팩터링은 하지 않는다.
4. **push 전에 반드시** `npm run check` (lint → typecheck → test → build) 를 통과시킨다.
   DB 를 건드렸으면 로컬 Postgres 에 `npm run migrate` 도 돌려 본다(아래 참고).
5. 커밋 메시지는 Conventional Commits, 제목은 한국어 가능: `feat: 할 일 목록 추가`.
6. push 후 **PR 을 만든다**. 본문은 `.github/pull_request_template.md` 형식으로 파일에 쓰고:
   `node scripts/gh.mjs pr-create --title "feat: ..." --body-file /tmp/pr.md`
   "무엇을 / 어떻게 확인했나 / 배포 영향" 을 비우지 않는다. 사용자는 휴대폰으로 PR 을
   볼 수 있다 — 무엇이 바뀌는지 첫 줄에서 알 수 있게 쓴다.
7. PR 을 연 뒤 `node scripts/gh.mjs pr-watch` 로 CI 를 기다리고 결과(체크, 프리뷰 링크)를
   사용자에게 한두 줄로 알린다. 실패하면 auto-fix 가 붙지만, 세션이 살아 있으면 직접 고쳐서
   push 하는 편이 빠르다.
8. **merge 하지 않는다.** 사용자가 요청해도 "PR 에서 merge 버튼을 눌러 주세요" 라고 안내한다.
   (merge 가 곧 프로덕션 배포이므로 사람이 누르는 것이 이 프로세스의 게이트다.)

PR 이 이미 열려 있는 브랜치에서 추가 요청을 받으면 같은 브랜치에 커밋을 더한다.

> **GitHub CLI 주의**: 클라우드 세션의 GitHub 프록시는 GraphQL 을 막는다. `gh pr create`,
> `gh pr list/checks/view`, `gh workflow run` 은 403 이 난다. `scripts/gh.mjs`(REST)나
> `gh api repos/{owner}/{repo}/...`, `gh run list/view` 를 쓴다. 세션이 PR 생성 버튼/도구를
> 따로 제공하면 그걸 써도 된다. `gh` 가 없으면 세션 시작 훅이 설치를 시도한다.

## 개발 상황을 물으면

`project-status` 스킬을 따른다. 요약: 열린 PR 과 각 CI/프리뷰 상태, 최근 merge 와
배포 결과, `docs/decisions.md` 의 미결 항목을 짧게 정리하고 다음에 할 일을 제안한다.

## 파이프라인 (건드리기 전에 이해할 것)

```
PR 생성/push ─► ci.yml
                 ├ test     lint · typecheck · test · 빈 Postgres 에 마이그레이션 · build
                 ├ preview  Neon 브랜치(프로덕션 복제)에 마이그레이션 → Vercel 프리뷰 → PR 코멘트
                 └ autofix  위가 실패하면 Claude 가 고쳐서 [claude-autofix] 커밋 (PR 당 최대 3회)
             ─► claude-review.yml   PR 이 열릴 때 자동 리뷰 코멘트
PR 코멘트 @claude ─► claude-mention.yml  지시대로 수정
merge ─► deploy.yml  프로덕션 마이그레이션 → Vercel 프로덕션 배포 → /api/health 확인 → PR 코멘트
PR 닫힘 ─► preview-cleanup.yml  Neon 프리뷰 브랜치 삭제
```

- 워크플로를 고칠 때는 그 이유를 PR 에 적는다. 시크릿 값을 로그에 찍지 않는다.
- `vercel.json` 과 Vercel Git 연동: Vercel 프로젝트는 Git 에 연결하지 않는다.
  배포는 deploy.yml 만 한다(마이그레이션 → 배포 순서를 보장하기 위해).

## 스택

- Next.js (App Router, `src/app`) + TypeScript. **AGENTS.md 경고대로** 이 Next.js 버전은
  학습 데이터와 다를 수 있다. 새 API 를 쓰기 전에 `node_modules/next/dist/docs/` 를 확인한다.
- DB: Neon Postgres. 드라이버는 `pg` (`src/lib/db.ts` 의 `query()`).
  ORM 은 없다. 필요해지면 도입을 제안하고 `docs/decisions.md` 에 남긴다.
- 테스트: Vitest (`test/**/*.test.ts`). 스타일은 기본 CSS(`globals.css`) — UI 라이브러리는
  필요할 때 제안한다.
- Node 24 (`.nvmrc`, `engines`).

## 데이터베이스 규칙

- 스키마 변경은 **반드시** `migrations/` 의 SQL 파일로. `npm run migrate:new -- <이름>` 으로 만든다
  (파일명 타임스탬프 = 적용 순서).
- **이미 main 에 들어간 마이그레이션 파일은 절대 수정하지 않는다.** 러너가 체크섬으로 막는다.
  바꿀 것은 새 마이그레이션으로 추가한다. 롤백 스크립트는 없다 — 되돌리는 마이그레이션을 쓴다.
- 각 파일은 하나의 트랜잭션. `CREATE INDEX CONCURRENTLY` 처럼 트랜잭션 밖에서만 되는 문장은
  쓰지 않는다(작은 프로젝트에서는 일반 `CREATE INDEX` 로 충분하다).
- 프로덕션에 이미 데이터가 있다고 가정한다. NOT NULL 컬럼 추가는 DEFAULT 와 함께,
  컬럼/테이블 삭제는 PR 본문 "배포 영향" 에 명시한다. preview job 이 프로덕션 복제본에서
  먼저 돌려 보므로 여기서 실패하면 merge 전에 드러난다.
- SQL 은 항상 파라미터 바인딩(`$1`). 문자열로 조합하지 않는다.
- 로컬 검증: 세션에 Postgres 가 있으면 시작 훅이 `TEST_DATABASE_URL` 을 설정한다.
  `DATABASE_URL=$TEST_DATABASE_URL npm run migrate` 로 적용해 볼 수 있다.
  `npm test` 도 이 값이 있으면 DB 테스트를 함께 돌린다.

## 환경변수와 비밀값

- 비밀값을 커밋하지 않는다. `.env*` 는 gitignore 되어 있고 Claude 는 읽지 않는다.
- 새 환경변수가 필요하면: 코드에서 없을 때 명확한 에러를 내고, PR 본문 "배포 영향" 에
  이름·용도·어디서 발급받는지 적는다. 값 설정은 사용자가 한다(Vercel 대시보드 또는
  `vercel env add`). Claude 가 대신 설정할 수단이 있어도 먼저 묻는다.
- 이미 있는 것: `DATABASE_URL`(pooled, 앱 런타임) / `DATABASE_URL_UNPOOLED`(direct).

## 인프라 결정

Vercel(배포)과 Neon(DB)은 고정이다. 그 밖의 것(인증, 파일 저장소, 크론, 이메일, 외부 API,
결제, 캐시 등)이 필요해 보이면:

1. 구현 전에 선택지 2~3개를 **비용(무료 한도)·설정 난이도·락인** 기준으로 짧게 비교해 제안하고
   사용자의 결정을 받는다. Vercel 마켓플레이스/내장 기능(Cron, Blob 등)을 먼저 검토한다.
2. 결정되면 `docs/decisions.md` 에 한 항목으로 기록한다(날짜, 결정, 이유, 대안).
3. 필요한 계정 가입/키 발급처럼 사용자만 할 수 있는 일은 체크리스트로 알려 준다.

## 코드 규칙

- 경로는 `path.join`, 임시 디렉터리는 `os.tmpdir()`. npm scripts 에 POSIX 전용 문법 금지.
- 테스트를 지우거나 skip 해서 통과시키지 않는다. `eslint-disable` / `@ts-ignore` 로 덮지 않는다.
- 사용자에게 보이는 문구는 한국어가 기본.
- 개인용 앱이라도 쓰기 API 는 인증 없이 공개하지 않는다. 인증 방식이 아직 없으면 먼저 묻는다.

## 명령

```bash
npm run dev             # 로컬 개발
npm run check           # lint + typecheck + test + build (push 전 필수)
npm run migrate:new -- add-todos
npm run migrate         # DATABASE_URL 대상
npm run migrate:status
node scripts/gh.mjs pr-list      # 열린 PR + CI 상태 (pr-create / pr-status / pr-watch / deploys)
```
