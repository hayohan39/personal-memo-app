-- 프롬프트 블록: 그룹(프로젝트) → 블록 → 항목
create table prompt_groups (
  id bigint generated always as identity primary key,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table prompt_blocks (
  id bigint generated always as identity primary key,
  group_id bigint not null references prompt_groups (id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prompt_blocks_group_idx on prompt_blocks (group_id, created_at);

create table prompt_items (
  id bigint generated always as identity primary key,
  block_id bigint not null references prompt_blocks (id) on delete cascade,
  text text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index prompt_items_block_idx on prompt_items (block_id, position, id);

-- 일간/주간 할 일. period_start 는 그 할 일이 속한 날짜(일간) 또는 주의 월요일(주간).
-- 미완료 항목은 조회 시점에 현재 기간으로 옮겨진다(이월). first_period 는 처음 만든 기간.
create table tasks (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('daily', 'weekly')),
  text text not null,
  done boolean not null default false,
  done_at timestamptz,
  period_start date not null,
  first_period date not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index tasks_kind_period_idx on tasks (kind, period_start);

insert into prompt_groups (name) values ('기본');
