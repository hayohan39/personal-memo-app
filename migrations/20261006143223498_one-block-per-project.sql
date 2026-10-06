-- 프로젝트(prompt_groups)마다 블록을 정확히 하나만 둔다.
-- 블록 제목(title)은 더 이상 쓰지 않는다. 컬럼은 남겨 두되 화면에서 쓰지 않는다.

-- 1. 블록이 없는 프로젝트에 빈 블록을 만든다.
insert into prompt_blocks (group_id)
select g.id from prompt_groups g
where not exists (select 1 from prompt_blocks b where b.group_id = g.id);

-- 2. 블록이 여러 개인 프로젝트는 가장 오래된 블록 하나로 합친다.
--    항목 순서: 오래된 블록부터, 블록 안에서는 원래 순서대로 이어 붙인다.
with keep as (
  select distinct on (group_id) group_id, id as keep_id
  from prompt_blocks
  order by group_id, created_at, id
), ordered as (
  select i.id,
         k.keep_id,
         row_number() over (partition by b.group_id order by b.created_at, b.id, i.position, i.id) as pos
  from prompt_items i
  join prompt_blocks b on b.id = i.block_id
  join keep k on k.group_id = b.group_id
)
update prompt_items i
set block_id = o.keep_id, position = o.pos
from ordered o
where o.id = i.id;

delete from prompt_blocks b
using (
  select distinct on (group_id) group_id, id as keep_id
  from prompt_blocks
  order by group_id, created_at, id
) k
where b.group_id = k.group_id and b.id <> k.keep_id;

-- 3. 앞으로도 프로젝트당 하나만 생기도록 막는다(기존 일반 인덱스는 이것으로 대체).
create unique index prompt_blocks_group_unique on prompt_blocks (group_id);
drop index prompt_blocks_group_idx;
