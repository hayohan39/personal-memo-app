// [템플릿 전용] 새 프로젝트의 Neon DB 와 Vercel 프로젝트를 만들고 서로, 그리고
// GitHub 리포지토리와 연결한다. new-project.yml 워크플로가 실행한다.
//
//   node scripts/provision.mjs --repo owner/name [--region aws-ap-southeast-1]
//
// 필요한 환경변수:
//   GH_TOKEN        대상 리포지토리에 시크릿/변수를 쓸 수 있는 토큰
//   NEON_API_KEY    Personal(또는 Organization) 키. project-scoped 키로는 프로젝트를 못 만든다
//   VERCEL_TOKEN
//   NEON_ORG_ID     (선택) Neon 조직이 여러 개일 때
//   VERCEL_TEAM_ID  (선택) Vercel 팀 계정일 때
//
// 다시 실행해도 안전하다(같은 이름의 프로젝트가 있으면 재사용한다).
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { connectionUris, neon, waitForOperations } from './neon.mjs';

const VERCEL_API = process.env.VERCEL_API_URL ?? 'https://api.vercel.com';

function args() {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1];
  return out;
}

function gh(argv, input) {
  execFileSync('gh', argv, { input, stdio: ['pipe', 'inherit', 'inherit'] });
}
const setSecret = (repo, key, value) => {
  gh(['secret', 'set', key, '-R', repo], value);
  console.log(`  secret ${key} → ${repo}`);
};
const setVariable = (repo, key, value) => {
  gh(['variable', 'set', key, '-R', repo, '--body', value]);
  console.log(`  variable ${key}=${value}`);
};

async function vercel(path, { method = 'GET', body } = {}) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN 이 없습니다.');
  const url = new URL(`${VERCEL_API}${path}`);
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set('teamId', process.env.VERCEL_TEAM_ID);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`Vercel ${method} ${path} → HTTP ${res.status}: ${data.error?.message ?? ''}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// ---------------------------------------------------------------------------

async function provisionNeon({ name, region }) {
  console.log('\n▶ Neon');
  const { projects } = await neon(`/projects?search=${encodeURIComponent(name)}&limit=100`);
  let project = projects?.find((p) => p.name === name);

  if (project) {
    console.log(`  기존 프로젝트 재사용: ${project.id}`);
  } else {
    try {
      const created = await neon('/projects', {
        method: 'POST',
        body: {
          project: {
            name,
            region_id: region,
            pg_version: 17,
            ...(process.env.NEON_ORG_ID ? { org_id: process.env.NEON_ORG_ID } : {}),
          },
        },
      });
      await waitForOperations(created.project.id, created.operations);
      project = created.project;
      console.log(`  생성: ${project.id} (${region})`);
    } catch (error) {
      if (/project-scoped/i.test(error.message)) {
        throw new Error(
          'NEON_API_KEY 가 project-scoped 키라 프로젝트를 만들 수 없습니다. ' +
            'Neon 콘솔 → Account settings → API keys 에서 Personal 키를 만드세요.',
        );
      }
      throw error;
    }
  }

  const { branches } = await neon(`/projects/${project.id}/branches`);
  const main = branches.find((b) => b.default) ?? branches.find((b) => b.primary) ?? branches[0];
  const uris = await connectionUris(project.id, main.id);
  return { projectId: project.id, ...uris };
}

async function provisionVercel({ name }) {
  console.log('\n▶ Vercel');
  let project;
  try {
    // framework 를 비워 두면 첫 배포에서 CLI 가 projectSettings 를 요구하며 실패한다.
    project = await vercel('/v11/projects', { method: 'POST', body: { name, framework: 'nextjs' } });
    console.log(`  생성: ${project.id}`);
  } catch (error) {
    if (error.status !== 409) throw error;
    project = await vercel(`/v9/projects/${encodeURIComponent(name)}`);
    console.log(`  기존 프로젝트 재사용: ${project.id}`);
  }
  return { projectId: project.id, orgId: project.accountId };
}

async function setVercelEnv(projectId, key, value) {
  // production 에만 넣는다. preview 는 PR 마다 Neon 브랜치 연결 문자열을
  // 배포 단위로 주입한다(ci.yml 의 preview job). 여기서 preview 에도 프로덕션
  // 값을 넣으면 PR 미리보기가 실서비스 DB 에 쓰게 된다.
  const result = await vercel(`/v10/projects/${projectId}/env?upsert=true`, {
    method: 'POST',
    body: { key, value, type: 'encrypted', target: ['production'] },
  });
  if (result.failed?.length) throw new Error(`Vercel env ${key} 실패: ${JSON.stringify(result.failed)}`);
  console.log(`  Vercel env ${key} (production)`);
}

// ---------------------------------------------------------------------------

const { repo, region = 'aws-ap-southeast-1' } = args();
if (!repo || !repo.includes('/')) {
  console.error('usage: node scripts/provision.mjs --repo owner/name [--region <neon-region>]');
  process.exit(1);
}
const name = repo.split('/')[1];

try {
  const db = await provisionNeon({ name, region });
  // 연결 문자열에는 비밀번호가 있다. Actions 로그에 남지 않게 마스킹한다.
  console.log(`::add-mask::${db.direct}`);
  console.log(`::add-mask::${db.pooled}`);
  setVariable(repo, 'NEON_PROJECT_ID', db.projectId);
  // GitHub 시크릿 DATABASE_URL 은 deploy.yml 의 마이그레이션이 쓴다 → direct 연결.
  setSecret(repo, 'DATABASE_URL', db.direct);

  const app = await provisionVercel({ name });
  setVariable(repo, 'VERCEL_PROJECT_ID', app.projectId);
  setVariable(repo, 'VERCEL_ORG_ID', app.orgId);
  // 앱 런타임은 pooled 연결. 마이그레이션 도구를 앱 안에서 돌릴 일이 생기면 UNPOOLED 를 쓴다.
  await setVercelEnv(app.projectId, 'DATABASE_URL', db.pooled);
  await setVercelEnv(app.projectId, 'DATABASE_URL_UNPOOLED', db.direct);

  console.log('\n✅ 프로비저닝 완료');
} catch (error) {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
}
