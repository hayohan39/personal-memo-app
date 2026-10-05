-- 프로젝트(= prompt_groups)마다 전체 복사 때 앞·뒤에 붙일 문구
alter table prompt_groups add column prefix text not null default '';
alter table prompt_groups add column suffix text not null default '';

-- 블록별로 앞·뒤 문구를 붙일지
alter table prompt_blocks add column use_wrap boolean not null default true;

-- 자유 양식 메모
create table notes (
  id bigint generated always as identity primary key,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_updated_idx on notes (updated_at desc);
