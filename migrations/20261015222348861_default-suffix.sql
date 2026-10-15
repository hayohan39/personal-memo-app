-- 프로젝트 뒤 문구(추가 요청)의 기본값.
-- 새 프로젝트는 이 문구로 시작하고, 뒤 문구가 비어 있던 기존 프로젝트에도 채운다.
-- 직접 적어 둔 뒤 문구는 건드리지 않는다.
alter table prompt_groups
  alter column suffix set default '애매한 사항이나 반드시 확인해야될 게 있으면 꼭 물어봐';

update prompt_groups
set suffix = '애매한 사항이나 반드시 확인해야될 게 있으면 꼭 물어봐'
where suffix = '';
