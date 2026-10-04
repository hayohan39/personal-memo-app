import { query } from "@/lib/db";
import { currentPeriod, type TaskKind } from "@/lib/period";

export type Group = { id: number; name: string };
export type Item = { id: number; text: string };
export type Block = { id: number; groupId: number; title: string; updatedAt: string; items: Item[] };
export type Task = {
  id: number;
  kind: TaskKind;
  text: string;
  done: boolean;
  periodStart: string;
  firstPeriod: string;
};
export type MemoState = {
  groups: Group[];
  blocks: Block[];
  daily: Task[];
  weekly: Task[];
  today: string;
  weekStart: string;
};

const TASK_COLUMNS = `id::int, kind, text, done, period_start::text as "periodStart", first_period::text as "firstPeriod"`;

// ── 할 일 ────────────────────────────────────────────────

/** 지난 기간의 미완료 항목을 현재 기간으로 옮긴다(이월). 조회 전에 부른다. */
export async function rollover(kind: TaskKind, now: Date): Promise<string> {
  const period = currentPeriod(kind, now);
  await query("update tasks set period_start = $2 where kind = $1 and not done and period_start < $2", [
    kind,
    period,
  ]);
  return period;
}

export async function listTasks(kind: TaskKind, now: Date): Promise<Task[]> {
  const period = await rollover(kind, now);
  return query<Task>(
    `select ${TASK_COLUMNS} from tasks where kind = $1 and period_start = $2 order by position, id`,
    [kind, period],
  );
}

export async function createTask(kind: TaskKind, text: string, now: Date): Promise<Task> {
  const period = currentPeriod(kind, now);
  const [task] = await query<Task>(
    `insert into tasks (kind, text, period_start, first_period, position)
     values ($1, $2, $3, $3, (select coalesce(max(position), 0) + 1 from tasks where kind = $1))
     returning ${TASK_COLUMNS}`,
    [kind, text, period],
  );
  return task;
}

export async function updateTask(id: number, patch: { text?: string; done?: boolean }): Promise<Task | null> {
  const [task] = await query<Task>(
    `update tasks set
       text = coalesce($2, text),
       done = coalesce($3, done),
       done_at = case when $3::boolean is null then done_at when $3 then now() else null end
     where id = $1
     returning ${TASK_COLUMNS}`,
    [id, patch.text ?? null, patch.done ?? null],
  );
  return task ?? null;
}

export async function deleteTask(id: number): Promise<void> {
  await query("delete from tasks where id = $1", [id]);
}

// ── 프롬프트 그룹 / 블록 / 항목 ───────────────────────────

export async function listGroups(): Promise<Group[]> {
  return query<Group>("select id::int, name from prompt_groups order by position, id");
}

export async function createGroup(name: string): Promise<Group> {
  const [group] = await query<Group>(
    `insert into prompt_groups (name, position)
     values ($1, (select coalesce(max(position), 0) + 1 from prompt_groups))
     returning id::int, name`,
    [name],
  );
  return group;
}

export async function renameGroup(id: number, name: string): Promise<Group | null> {
  const [group] = await query<Group>("update prompt_groups set name = $2 where id = $1 returning id::int, name", [
    id,
    name,
  ]);
  return group ?? null;
}

export async function deleteGroup(id: number): Promise<void> {
  await query("delete from prompt_groups where id = $1", [id]);
}

type BlockRow = Omit<Block, "items">;
const BLOCK_COLUMNS = `id::int, group_id::int as "groupId", title, updated_at as "updatedAt"`;

export async function listBlocks(): Promise<Block[]> {
  const blocks = await query<BlockRow>(`select ${BLOCK_COLUMNS} from prompt_blocks order by created_at desc, id desc`);
  const items = await query<Item & { blockId: number }>(
    `select id::int, block_id::int as "blockId", text from prompt_items order by position, id`,
  );
  return blocks.map((b) => ({
    ...b,
    updatedAt: new Date(b.updatedAt).toISOString(),
    items: items.filter((i) => i.blockId === b.id).map(({ id, text }) => ({ id, text })),
  }));
}

export async function createBlock(groupId: number, title = ""): Promise<Block | null> {
  const [block] = await query<BlockRow>(
    `insert into prompt_blocks (group_id, title)
     select id, $2 from prompt_groups where id = $1
     returning ${BLOCK_COLUMNS}`,
    [groupId, title],
  );
  return block ? { ...block, updatedAt: new Date(block.updatedAt).toISOString(), items: [] } : null;
}

export async function updateBlock(id: number, patch: { title?: string; groupId?: number }): Promise<boolean> {
  const rows = await query(
    `update prompt_blocks set
       title = coalesce($2, title),
       group_id = coalesce((select id from prompt_groups where id = $3), group_id),
       updated_at = now()
     where id = $1 returning id`,
    [id, patch.title ?? null, patch.groupId ?? null],
  );
  return rows.length > 0;
}

export async function deleteBlock(id: number): Promise<void> {
  await query("delete from prompt_blocks where id = $1", [id]);
}

async function touchBlock(blockId: number): Promise<void> {
  await query("update prompt_blocks set updated_at = now() where id = $1", [blockId]);
}

export async function createItem(blockId: number, text: string): Promise<Item | null> {
  const [item] = await query<Item>(
    `insert into prompt_items (block_id, text, position)
     select id, $2, (select coalesce(max(position), 0) + 1 from prompt_items where block_id = $1)
     from prompt_blocks where id = $1
     returning id::int, text`,
    [blockId, text],
  );
  if (item) await touchBlock(blockId);
  return item ?? null;
}

export async function updateItem(id: number, text: string): Promise<Item | null> {
  const [item] = await query<Item & { blockId: number }>(
    `update prompt_items set text = $2 where id = $1 returning id::int, text, block_id::int as "blockId"`,
    [id, text],
  );
  if (!item) return null;
  await touchBlock(item.blockId);
  return { id: item.id, text: item.text };
}

export async function deleteItem(id: number): Promise<void> {
  const rows = await query<{ blockId: number }>(
    `delete from prompt_items where id = $1 returning block_id::int as "blockId"`,
    [id],
  );
  if (rows[0]) await touchBlock(rows[0].blockId);
}

// ── 전체 ─────────────────────────────────────────────────

export async function loadState(now: Date): Promise<MemoState> {
  const [groups, blocks, daily, weekly] = await Promise.all([
    listGroups(),
    listBlocks(),
    listTasks("daily", now),
    listTasks("weekly", now),
  ]);
  return {
    groups,
    blocks,
    daily,
    weekly,
    today: currentPeriod("daily", now),
    weekStart: currentPeriod("weekly", now),
  };
}
