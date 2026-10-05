import { query } from "@/lib/db";
import { currentPeriod, type TaskKind } from "@/lib/period";

/** 프로젝트. prefix/suffix 는 블록을 전체 복사할 때 앞·뒤에 붙는 문구. (DB 테이블 이름은 prompt_groups) */
export type Group = { id: number; name: string; prefix: string; suffix: string };
export type Item = { id: number; text: string };
export type Block = {
  id: number;
  groupId: number;
  title: string;
  /** 전체 복사 때 프로젝트의 앞·뒤 문구를 붙일지 */
  useWrap: boolean;
  updatedAt: string;
  items: Item[];
};
export type Note = { id: number; title: string; body: string; updatedAt: string };
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
  notes: Note[];
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

/** 일간 ↔ 주간으로 옮긴다. 옮긴 쪽의 현재 기간(오늘 / 이번 주)에 들어간다. */
export async function moveTask(id: number, kind: TaskKind, now: Date): Promise<Task | null> {
  const period = currentPeriod(kind, now);
  const [task] = await query<Task>(
    `update tasks set
       kind = $2,
       period_start = $3,
       first_period = $3,
       position = (select coalesce(max(position), 0) + 1 from tasks where kind = $2)
     where id = $1
     returning ${TASK_COLUMNS}`,
    [id, kind, period],
  );
  return task ?? null;
}

export async function deleteTask(id: number): Promise<void> {
  await query("delete from tasks where id = $1", [id]);
}

// ── 프롬프트 그룹 / 블록 / 항목 ───────────────────────────

const GROUP_COLUMNS = "id::int, name, prefix, suffix";

export async function listGroups(): Promise<Group[]> {
  return query<Group>(`select ${GROUP_COLUMNS} from prompt_groups order by position, id`);
}

export async function createGroup(name: string): Promise<Group> {
  const [group] = await query<Group>(
    `insert into prompt_groups (name, position)
     values ($1, (select coalesce(max(position), 0) + 1 from prompt_groups))
     returning ${GROUP_COLUMNS}`,
    [name],
  );
  return group;
}

export async function updateGroup(
  id: number,
  patch: { name?: string; prefix?: string; suffix?: string },
): Promise<Group | null> {
  const [group] = await query<Group>(
    `update prompt_groups set
       name = coalesce($2, name),
       prefix = coalesce($3, prefix),
       suffix = coalesce($4, suffix)
     where id = $1
     returning ${GROUP_COLUMNS}`,
    [id, patch.name ?? null, patch.prefix ?? null, patch.suffix ?? null],
  );
  return group ?? null;
}

export async function deleteGroup(id: number): Promise<void> {
  await query("delete from prompt_groups where id = $1", [id]);
}

type BlockRow = Omit<Block, "items">;
const BLOCK_COLUMNS = `id::int, group_id::int as "groupId", title, use_wrap as "useWrap", updated_at as "updatedAt"`;

export async function listBlocks(): Promise<Block[]> {
  // 항목까지 한 번에 가져온다(DB 왕복 1회).
  const rows = await query<BlockRow & { items: Item[] }>(
    `select b.id::int, b.group_id::int as "groupId", b.title, b.use_wrap as "useWrap", b.updated_at as "updatedAt",
            coalesce(json_agg(json_build_object('id', i.id, 'text', i.text) order by i.position, i.id)
                     filter (where i.id is not null), '[]') as items
     from prompt_blocks b
     left join prompt_items i on i.block_id = b.id
     group by b.id
     order by b.created_at desc, b.id desc`,
  );
  return rows.map((b) => ({ ...b, updatedAt: new Date(b.updatedAt).toISOString() }));
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

export async function updateBlock(
  id: number,
  patch: { title?: string; groupId?: number; useWrap?: boolean },
): Promise<boolean> {
  const rows = await query(
    `update prompt_blocks set
       title = coalesce($2, title),
       group_id = coalesce((select id from prompt_groups where id = $3), group_id),
       use_wrap = coalesce($4, use_wrap),
       updated_at = now()
     where id = $1 returning id`,
    [id, patch.title ?? null, patch.groupId ?? null, patch.useWrap ?? null],
  );
  return rows.length > 0;
}

export async function deleteBlock(id: number): Promise<void> {
  await query("delete from prompt_blocks where id = $1", [id]);
}

// 항목을 바꾸면 블록의 updated_at 도 같은 문장에서 갱신한다(DB 왕복 1회).
export async function createItem(blockId: number, text: string): Promise<Item | null> {
  const [item] = await query<Item>(
    `with ins as (
       insert into prompt_items (block_id, text, position)
       select id, $2, (select coalesce(max(position), 0) + 1 from prompt_items where block_id = $1)
       from prompt_blocks where id = $1
       returning id, text, block_id
     ), touch as (
       update prompt_blocks set updated_at = now() where id in (select block_id from ins)
     )
     select id::int, text from ins`,
    [blockId, text],
  );
  return item ?? null;
}

export async function updateItem(id: number, text: string): Promise<Item | null> {
  const [item] = await query<Item>(
    `with upd as (
       update prompt_items set text = $2 where id = $1 returning id, text, block_id
     ), touch as (
       update prompt_blocks set updated_at = now() where id in (select block_id from upd)
     )
     select id::int, text from upd`,
    [id, text],
  );
  return item ?? null;
}

export async function deleteItem(id: number): Promise<void> {
  await query(
    `with del as (
       delete from prompt_items where id = $1 returning block_id
     )
     update prompt_blocks set updated_at = now() where id in (select block_id from del)`,
    [id],
  );
}

// ── 메모 ─────────────────────────────────────────────────

const NOTE_COLUMNS = `id::int, title, body, updated_at as "updatedAt"`;
const toNote = (n: Note): Note => ({ ...n, updatedAt: new Date(n.updatedAt).toISOString() });

export async function listNotes(): Promise<Note[]> {
  const rows = await query<Note>(`select ${NOTE_COLUMNS} from notes order by updated_at desc, id desc`);
  return rows.map(toNote);
}

export async function createNote(title = "", body = ""): Promise<Note> {
  const [note] = await query<Note>(`insert into notes (title, body) values ($1, $2) returning ${NOTE_COLUMNS}`, [
    title,
    body,
  ]);
  return toNote(note);
}

export async function updateNote(id: number, patch: { title?: string; body?: string }): Promise<Note | null> {
  const [note] = await query<Note>(
    `update notes set title = coalesce($2, title), body = coalesce($3, body), updated_at = now()
     where id = $1 returning ${NOTE_COLUMNS}`,
    [id, patch.title ?? null, patch.body ?? null],
  );
  return note ? toNote(note) : null;
}

export async function deleteNote(id: number): Promise<void> {
  await query("delete from notes where id = $1", [id]);
}

// ── 전체 ─────────────────────────────────────────────────

/** 일간·주간 이월을 한 문장으로 처리한다. */
async function rolloverAll(today: string, weekStart: string): Promise<void> {
  await query(
    `update tasks set period_start = case kind when 'daily' then $1::date else $2::date end
     where not done and period_start < case kind when 'daily' then $1::date else $2::date end`,
    [today, weekStart],
  );
}

export async function loadState(now: Date): Promise<MemoState> {
  const today = currentPeriod("daily", now);
  const weekStart = currentPeriod("weekly", now);
  await rolloverAll(today, weekStart);
  const [groups, blocks, notes, tasks] = await Promise.all([
    listGroups(),
    listBlocks(),
    listNotes(),
    query<Task>(
      `select ${TASK_COLUMNS} from tasks
       where (kind = 'daily' and period_start = $1) or (kind = 'weekly' and period_start = $2)
       order by position, id`,
      [today, weekStart],
    ),
  ]);
  return {
    groups,
    blocks,
    daily: tasks.filter((t) => t.kind === "daily"),
    weekly: tasks.filter((t) => t.kind === "weekly"),
    notes,
    today,
    weekStart,
  };
}
