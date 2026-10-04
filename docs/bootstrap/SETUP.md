# 최초 1회 설정

project-bootstrap 리포지토리에 한 번만 해 두면, 이후 새 프로젝트는 워크플로 실행 한 번이다.

## 1. 이 리포지토리를 템플릿으로 지정

GitHub → Settings → General → **Template repository** 체크.
(new-project 워크플로는 템플릿으로 지정된 리포지토리에서만 돈다.)

## 2. Claude GitHub App — All repositories

https://github.com/apps/claude → Configure → Repository access → **All repositories**

- 새로 만든 리포지토리를 claude.ai/code 에서 바로 고를 수 있다.
- CI auto-fix 가 App 토큰으로 push 하므로 그 push 가 CI 를 다시 돌린다
  (`GITHUB_TOKEN` 으로 한 push 는 워크플로를 트리거하지 않는다).

## 3. 시크릿 (Settings → Secrets and variables → Actions)

| 이름 | 필수 | 용도 | 발급 |
| --- | --- | --- | --- |
| `BOOTSTRAP_PAT` | ✅ | 새 리포지토리 생성, 시크릿/변수 설정, 초기화 push | **classic** PAT, 스코프 `repo` + `workflow` — https://github.com/settings/tokens/new |
| `CLAUDE_CODE_OAUTH_TOKEN` | ✅* | Actions 안의 Claude (auto-fix, 리뷰, @claude) | 터미널에서 `claude setup-token` (구독 사용량으로 동작) |
| `ANTHROPIC_API_KEY` | * | 위와 같음, API 과금으로 | https://console.anthropic.com/settings/keys |
| `VERCEL_TOKEN` | ✅ | Vercel 프로젝트 생성·배포 | https://vercel.com/account/tokens |
| `NEON_API_KEY` | ✅ | Neon 프로젝트 생성, PR 프리뷰 브랜치 | Neon 콘솔 → 사용자 메뉴 → Account settings → API keys (**Personal 키**. project-scoped 키로는 프로젝트를 못 만든다) |
| `BOT_PAT` | 선택 | Claude App 없이 auto-fix push 가 CI 를 재실행하게 | fine-grained PAT: Contents / Pull requests / Workflows RW |
| `NEON_ORG_ID` | 선택 | Neon 조직이 여러 개일 때 | Neon 콘솔 |
| `VERCEL_TEAM_ID` | 선택 | Vercel 팀 계정일 때 (개인 계정이면 넣지 않음) | Vercel 팀 설정 |

\* 둘 중 하나. 공통 시크릿(Claude/Vercel/Neon/BOT_PAT)은 새 프로젝트로 **자동 복사**된다.

`BOOTSTRAP_PAT` 은 템플릿 리포지토리에만 두고 복사하지 않는다.

## 4. 변수 (선택)

| 이름 | 기본값 | 의미 |
| --- | --- | --- |
| `NEON_REGION` | `aws-ap-southeast-1` | 새 Neon 프로젝트 리전 (Neon 에는 서울/도쿄가 없고 싱가포르가 가장 가깝다) |
| `CLAUDE_MODEL` | `claude-sonnet-5` | Actions 안의 Claude 모델. 새 프로젝트로도 복사된다 |

프로젝트별 변수(새 프로젝트 쪽에서 바꿈):

| 이름 | 기본값 | 의미 |
| --- | --- | --- |
| `AUTOFIX_MAX_ATTEMPTS` | `3` | PR 당 auto-fix 최대 시도 |
| `CLAUDE_REVIEW` | (켜짐) | `false` 면 PR 자동 리뷰 끔 |

## 5. 확인

claude.ai/code 에서 project-bootstrap 으로 세션을 열고 "테스트용 프로젝트 hello-bootstrap 만들어줘".
→ Actions 의 New project 실행이 초록이고, 새 리포지토리의 Deploy 가 초록이며
`https://hello-bootstrap*.vercel.app/api/health` 가 `{"ok":true, "database":{"state":"ok"…}}` 이면 끝.
확인 후 지우려면: GitHub 리포지토리, Vercel 프로젝트, Neon 프로젝트를 각각 삭제.

## 무료 한도 메모

| 서비스 | 한도 (Free/Hobby) | 이 흐름에서의 소비 |
| --- | --- | --- |
| GitHub Actions (private) | 월 2,000분 | PR push 1회 ≈ test 2~3분 + preview 1~2분 |
| Vercel Hobby | 개인·비상업 용도 | 빌드는 Vercel 에서(원격 빌드) |
| Neon Free | 프로젝트 100개, 프로젝트당 0.5GB, 브랜치 수 제한 | 프로젝트 1개 + 열린 PR 수만큼 브랜치 |
| Claude | 구독 사용량 또는 API 과금 | auto-fix · 리뷰 · @claude 실행 시 |

한도 수치는 바뀔 수 있으니 각 서비스 요금 페이지에서 확인한다.
