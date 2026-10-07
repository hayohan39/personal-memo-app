-- 처음 마이그레이션이 넣은 "기본" 프로젝트를 지운다.
-- 항목이 들어 있으면 사용자의 데이터이므로 남겨 둔다(화면의 "삭제" 버튼으로 지울 수 있다).
delete from prompt_groups g
where g.name = '기본'
  and not exists (
    select 1
    from prompt_blocks b
    join prompt_items i on i.block_id = b.id
    where b.group_id = g.id
  );
