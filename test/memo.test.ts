import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_SUFFIX } from "@/lib/copy";

// 실제 Postgres 가 있을 때만 돈다(CI 는 TEST_DATABASE_URL 을 준다).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("memo 데이터 계층 (실제 DB)", () => {
  const schema = `memo_${Date.now()}`;
  let memo: typeof import("@/lib/memo");
  let db: typeof import("@/lib/db");

  beforeAll(async () => {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(`create schema ${schema}`);
    await client.query(`set search_path to ${schema}`);
    const dir = path.resolve("migrations");
    for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
      await client.query(await readFile(path.join(dir, file), "utf8"));
    }
    await client.end();

    process.env.DATABASE_URL = `${url}${url!.includes("?") ? "&" : "?"}options=-c%20search_path%3D${schema}`;
    db = await import("@/lib/db");
    memo = await import("@/lib/memo");
  });

  afterAll(async () => {
    await db?.getPool().end();
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(`drop schema if exists ${schema} cascade`);
    await client.end();
  });

  it("빈 \"기본\" 프로젝트는 마이그레이션으로 지워진다", async () => {
    expect((await memo.listGroups()).map((g) => g.name)).not.toContain("기본");
  });

  // 한국 시간 기준 시각을 만든다.
  const kst = (s: string) => new Date(`${s}+09:00`);

  it("일간: 완료 못 한 일은 자정이 지나면 다음 날로 넘어간다", async () => {
    const day1 = kst("2026-10-05T10:00:00");
    const a = await memo.createTask("daily", "끝낼 일", day1);
    await memo.createTask("daily", "못 끝낸 일", day1);
    await memo.updateTask(a.id, { done: true });

    // 같은 날 23:59 에는 그대로
    expect((await memo.listTasks("daily", kst("2026-10-05T23:59:00"))).map((t) => t.text)).toEqual([
      "끝낼 일",
      "못 끝낸 일",
    ]);

    // 다음 날 0시: 미완료만 넘어오고, 처음 날짜는 유지된다
    const next = await memo.listTasks("daily", kst("2026-10-06T00:00:00"));
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ text: "못 끝낸 일", periodStart: "2026-10-06", firstPeriod: "2026-10-05" });

    // 며칠 비웠다 와도 오늘로 온다
    const later = await memo.listTasks("daily", kst("2026-10-09T08:00:00"));
    expect(later.map((t) => t.periodStart)).toEqual(["2026-10-09"]);
  });

  it("주간: 일요일 자정이 지나야 다음 주로 넘어간다", async () => {
    const monday = kst("2026-10-05T09:00:00");
    await memo.createTask("weekly", "주간 일", monday);

    const sunday = await memo.listTasks("weekly", kst("2026-10-11T23:59:00"));
    expect(sunday.map((t) => t.periodStart)).toEqual(["2026-10-05"]);

    const nextWeek = await memo.listTasks("weekly", kst("2026-10-12T00:00:00"));
    expect(nextWeek).toHaveLength(1);
    expect(nextWeek[0]).toMatchObject({ periodStart: "2026-10-12", firstPeriod: "2026-10-05" });
  });

  it("프로젝트를 만들면 블록이 하나 생기고, 항목을 만들고 고치고 지운다", async () => {
    const { group, block } = await memo.createGroup("project-a");
    expect(block).toMatchObject({ groupId: group.id, useWrap: true, items: [] });
    const one = await memo.createItem(block.id, "폼 만들기");
    await memo.createItem(block.id, "검증 추가");
    await memo.updateItem(one!.id, "폼 만들기 (모바일)");

    let blocks = (await memo.listBlocks()).filter((b) => b.groupId === group.id);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].items.map((i) => i.text)).toEqual(["폼 만들기 (모바일)", "검증 추가"]);

    await memo.deleteItem(one!.id);
    blocks = (await memo.listBlocks()).filter((b) => b.groupId === group.id);
    expect(blocks[0].items.map((i) => i.text)).toEqual(["검증 추가"]);

    // 비우기
    expect(await memo.clearBlock(block.id)).toBe(true);
    blocks = (await memo.listBlocks()).filter((b) => b.groupId === group.id);
    expect(blocks[0].items).toEqual([]);
    expect(await memo.clearBlock(999_999)).toBe(false);

    // 프로젝트를 지우면 블록도 같이
    await memo.deleteGroup(group.id);
    expect((await memo.listBlocks()).some((b) => b.id === block.id)).toBe(false);
  });

  it("항목을 다른 프로젝트 블록의 맨 아래로 옮긴다", async () => {
    const a = await memo.createGroup("move-a");
    const b = await memo.createGroup("move-b");
    const x = await memo.createItem(a.block.id, "옮길 항목");
    await memo.createItem(a.block.id, "남을 항목");
    await memo.createItem(b.block.id, "원래 있던 항목");

    expect(await memo.moveItem(x!.id, b.block.id)).toMatchObject({ text: "옮길 항목" });
    const blocks = await memo.listBlocks();
    expect(blocks.find((bl) => bl.id === a.block.id)?.items.map((i) => i.text)).toEqual(["남을 항목"]);
    expect(blocks.find((bl) => bl.id === b.block.id)?.items.map((i) => i.text)).toEqual([
      "원래 있던 항목",
      "옮길 항목",
    ]);
    // 없는 블록으로는 옮기지 않는다
    expect(await memo.moveItem(x!.id, 999_999)).toBeNull();
  });

  it("loadState: 이월을 한 번에 처리하고 블록과 항목을 함께 돌려준다", async () => {
    const day = kst("2026-11-02T09:00:00"); // 월요일
    await memo.createTask("daily", "어제 못 한 일", kst("2026-11-01T09:00:00"));
    await memo.createTask("weekly", "지난주 못 한 일", kst("2026-10-28T09:00:00"));
    const { group, block } = await memo.createGroup("load");
    await memo.createItem(block.id, "첫째");
    await memo.createItem(block.id, "둘째");

    const state = await memo.loadState(day);
    expect(state.today).toBe("2026-11-02");
    expect(state.weekStart).toBe("2026-11-02");
    expect(state.daily.find((t) => t.text === "어제 못 한 일")).toMatchObject({ periodStart: "2026-11-02" });
    expect(state.weekly.find((t) => t.text === "지난주 못 한 일")).toMatchObject({ periodStart: "2026-11-02" });
    expect(state.daily.every((t) => t.kind === "daily")).toBe(true);
    const loaded = state.blocks.find((b) => b.id === block.id);
    expect(loaded?.items.map((i) => i.text)).toEqual(["첫째", "둘째"]);
    expect(typeof loaded?.items[0].id).toBe("number");
    expect(state.blocks.filter((b) => b.groupId === group.id)).toHaveLength(1);
  });

  it("할 일을 일간 ↔ 주간으로 옮기면 그쪽의 현재 기간으로 간다", async () => {
    const wed = kst("2026-11-11T10:00:00"); // 수요일, 주 시작은 11-09
    const t = await memo.createTask("daily", "옮길 일", wed);
    const toWeekly = await memo.moveTask(t.id, "weekly", wed);
    expect(toWeekly).toMatchObject({ kind: "weekly", periodStart: "2026-11-09", firstPeriod: "2026-11-09" });
    const back = await memo.moveTask(t.id, "daily", wed);
    expect(back).toMatchObject({ kind: "daily", periodStart: "2026-11-11" });
    expect(await memo.moveTask(999_999, "daily", wed)).toBeNull();
  });

  it("프로젝트 앞·뒤 문구와 블록 useWrap 을 저장한다", async () => {
    const { group, block } = await memo.createGroup("wrap");
    expect(group).toMatchObject({ prefix: "", suffix: DEFAULT_SUFFIX });
    expect(await memo.updateGroup(group.id, { prefix: "앞" })).toMatchObject({
      name: "wrap",
      prefix: "앞",
      suffix: DEFAULT_SUFFIX,
    });
    expect(await memo.updateGroup(group.id, { suffix: "뒤", name: "wrap2" })).toMatchObject({
      name: "wrap2",
      prefix: "앞",
      suffix: "뒤",
    });
    expect(block.useWrap).toBe(true);
    await memo.updateBlock(block.id, { useWrap: false });
    expect((await memo.listBlocks()).find((b) => b.id === block.id)?.useWrap).toBe(false);
  });

  it("메모를 만들고 고치고 지운다. 최근에 고친 것이 먼저 온다", async () => {
    const a = await memo.createNote("a", "");
    const b = await memo.createNote("", "본문");
    await memo.updateNote(a.id, { body: "나중에 고침" });
    const list = await memo.listNotes();
    expect(list.slice(0, 2).map((n) => n.id)).toEqual([a.id, b.id]);
    expect(list[0]).toMatchObject({ title: "a", body: "나중에 고침" });
    await memo.deleteNote(b.id);
    expect((await memo.listNotes()).some((n) => n.id === b.id)).toBe(false);
    expect(await memo.updateNote(b.id, { title: "x" })).toBeNull();
  });
});
