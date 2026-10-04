import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

  it("그룹 → 블록 → 항목을 만들고 고치고 지운다", async () => {
    const group = await memo.createGroup("project-a");
    const block = await memo.createBlock(group.id, "로그인");
    expect(block).not.toBeNull();
    const one = await memo.createItem(block!.id, "폼 만들기");
    await memo.createItem(block!.id, "검증 추가");
    await memo.updateItem(one!.id, "폼 만들기 (모바일)");

    let blocks = (await memo.listBlocks()).filter((b) => b.groupId === group.id);
    expect(blocks[0].items.map((i) => i.text)).toEqual(["폼 만들기 (모바일)", "검증 추가"]);

    await memo.deleteItem(one!.id);
    await memo.updateBlock(block!.id, { title: "로그인 v2" });
    blocks = (await memo.listBlocks()).filter((b) => b.groupId === group.id);
    expect(blocks[0]).toMatchObject({ title: "로그인 v2", items: [{ text: "검증 추가" }] });

    // 없는 그룹으로는 만들 수 없다
    expect(await memo.createBlock(999_999)).toBeNull();

    // 그룹을 지우면 블록도 같이
    await memo.deleteGroup(group.id);
    expect((await memo.listBlocks()).some((b) => b.id === block!.id)).toBe(false);
  });
});
