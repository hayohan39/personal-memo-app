# 템플릿 유지보수

이 리포지토리는 **템플릿이자 컨트롤 리포지토리**다.

- 템플릿: "Use this template"/`new-project.yml` 이 이 리포지토리의 main 을 그대로 복사한다.
- 컨트롤: `new-project.yml` 이 리포지토리 생성·프로비저닝·초기화를 한다.

## 파일 구분

새 프로젝트로 복사된 뒤 `scripts/init-project.mjs` 가 지우는 **템플릿 전용** 파일
(목록은 그 스크립트의 `TEMPLATE_ONLY`):

- `.github/workflows/new-project.yml`
- `.claude/skills/new-project/`
- `scripts/provision.mjs`, `scripts/init-project.mjs`
- `test/template/`
- `docs/bootstrap/` (단, `project-README.md` 는 새 프로젝트의 `README.md` 가 된다)
- `CLAUDE.md` 안의 `<!-- template-only:start/end -->` 블록

플레이스홀더 `{{PROJECT_NAME}}`, `{{PROJECT_DESCRIPTION}}`, `{{CREATED_AT}}` 는
`src/lib/project.ts`, `CLAUDE.md`, `README.md`, `docs/decisions.md` 에서만 치환된다.
다른 파일에 새로 쓰려면 `PLACEHOLDER_FILES` 에 추가한다.

## 템플릿 리포지토리 자신의 워크플로

- `ci.yml` 의 `test` 는 템플릿에서도 돈다 → 템플릿 앱이 항상 초록인지 확인.
- `preview`, `deploy.yml`, `preview-cleanup.yml` 은 `github.event.repository.is_template`
  으로 템플릿 리포지토리에서는 건너뛴다.
- auto-fix / 리뷰 / @claude 는 템플릿 PR 에서도 동작한다.

## 이미 만든 프로젝트에 템플릿 변경을 반영하려면

템플릿과 프로젝트 사이에 자동 동기화는 없다(프로젝트마다 갈라지는 것이 정상).
워크플로 개선처럼 옮기고 싶은 것이 있으면 그 프로젝트 세션에서
"project-bootstrap 의 ci.yml 변경을 반영해줘" 처럼 요청한다.

## 검증

```bash
npm ci
npm run check                     # 템플릿 테스트(test/template) 포함
TEST_DATABASE_URL=postgres://... npm test   # 마이그레이션 러너 실제 DB 테스트
```

워크플로를 바꿨으면 `actionlint` 로 확인한다.

## 설계 근거

왜 이렇게 만들었는지(클라우드 세션 제약, Neon 선택, 배포 순서, auto-fix 토큰 등)는
[DESIGN.md](DESIGN.md) 에 있다. 구조를 바꾸기 전에 읽는다.
