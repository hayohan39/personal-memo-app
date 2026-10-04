"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logout } from "@/app/login/actions";
import type { Block, Group, Item, MemoState, Task } from "@/lib/memo";
import { formatDay, formatWeek, type TaskKind } from "@/lib/period";
import { GROUP_COOKIE, TAB_COOKIE, type Tab } from "@/lib/prefs";
import { api, copyText } from "./client";
import { PromptBoard, type BoardActions } from "./prompt-board";
import { TaskList } from "./task-list";

function remember(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

type Props = { initial: MemoState; initialTab: Tab; initialGroup: number | null };

export function MemoApp({ initial, initialTab, initialGroup }: Props) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(
    initial.groups.some((g) => g.id === initialGroup) ? initialGroup : (initial.groups[0]?.id ?? null),
  );
  const [focusBlockId, setFocusBlockId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const loadedAt = useRef(0);
  const dailyInput = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((text: string, error = false) => {
    clearTimeout(toastTimer.current);
    setToast({ text, error });
    toastTimer.current = setTimeout(() => setToast(null), error ? 4000 : 1500);
  }, []);

  // 마우스가 있는 기기에서는 오늘 입력칸에 바로 포커스(휴대폰은 키보드가 튀어나와서 하지 않는다).
  useEffect(() => {
    loadedAt.current = Date.now();
    if (window.matchMedia("(pointer: fine)").matches) dailyInput.current?.focus({ preventScroll: true });
  }, []);

  // ── 저장 ──
  // 화면은 즉시 바꾸고, 서버 요청은 큐에 넣어 순서대로 보낸다(빠르게 연달아 눌러도 순서가 지켜진다).
  // 새로 만든 것은 음수 임시 id 로 바로 보여 주고, 서버가 준 진짜 id 는 realIds 에 기록한다.
  // 화면의 id 는 바꾸지 않으므로 입력 중인 칸이 다시 그려지며 포커스를 잃는 일이 없다.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pendingWrites = useRef(0);
  const realIds = useRef(new Map<number, number>());
  const tempSeq = useRef(0);
  const nextTempId = () => --tempSeq.current;

  const realId = (id: number): number => {
    const real = id > 0 ? id : realIds.current.get(id);
    if (real === undefined) throw new Error("앞선 저장이 실패했습니다.");
    return real;
  };

  const reload = useCallback(async () => {
    const next = await api<MemoState>("GET", "/api/state");
    loadedAt.current = Date.now();
    realIds.current.clear();
    setState(next);
  }, []);

  /** 서버 요청을 큐에 넣는다. 실패하면 알리고 서버 상태로 다시 맞춘다. */
  const enqueue = (request: () => Promise<unknown>) => {
    pendingWrites.current += 1;
    queue.current = queue.current
      .then(async () => {
        await request();
      })
      .catch(async (error) => {
        show(`저장 실패: ${(error as Error).message}`, true);
        await reload().catch(() => undefined);
      })
      .finally(() => {
        pendingWrites.current -= 1;
      });
  };

  /** 새로 만든 것의 진짜 id 를 기록한다. */
  const created = (tempId: number) => (row: { id: number }) => {
    realIds.current.set(tempId, row.id);
  };

  // 다른 기기에서 고쳤거나 자정이 지났을 수 있으니, 다시 볼 때 새로 불러온다.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - loadedAt.current < 30_000) return;
      if (pendingWrites.current > 0) return; // 저장 중엔 건드리지 않는다
      if (document.activeElement?.matches("textarea, input")) return; // 입력 중엔 건드리지 않는다
      reload().catch(() => undefined); // 조용히 다음 기회에
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);

  const selectTab = (next: Tab) => {
    setTab(next);
    remember(TAB_COOKIE, next);
  };
  const selectGroup = (id: number) => {
    setSelectedGroup(id);
    // 임시 그룹이면 저장이 끝난 뒤 진짜 id 로 기억한다.
    if (id > 0) remember(GROUP_COOKIE, String(id));
    else enqueue(async () => remember(GROUP_COOKIE, String(realId(id))));
  };

  // ── 할 일 ──
  const mapTasks = (s: MemoState, kind: TaskKind, fn: (tasks: Task[]) => Task[]): MemoState => ({
    ...s,
    [kind]: fn(s[kind]),
  });

  const addTask = (kind: TaskKind, text: string) => {
    const id = nextTempId();
    setState((s) => {
      const period = kind === "daily" ? s.today : s.weekStart;
      const task: Task = { id, kind, text, done: false, periodStart: period, firstPeriod: period };
      return mapTasks(s, kind, (ts) => [...ts, task]);
    });
    enqueue(() => api<Task>("POST", "/api/tasks", { kind, text }).then(created(id)));
  };
  const updateTask = (task: Task, patch: { text?: string; done?: boolean }) => {
    setState((s) => mapTasks(s, task.kind, (ts) => ts.map((t) => (t.id === task.id ? { ...t, ...patch } : t))));
    enqueue(() => api("PATCH", `/api/tasks/${realId(task.id)}`, patch));
  };
  const deleteTask = (task: Task) => {
    setState((s) => mapTasks(s, task.kind, (ts) => ts.filter((t) => t.id !== task.id)));
    enqueue(() => api("DELETE", `/api/tasks/${realId(task.id)}`));
  };

  // ── 프롬프트 블록 ──
  const mapBlock = (s: MemoState, id: number, fn: (b: Block) => Block): MemoState => ({
    ...s,
    blocks: s.blocks.map((b) => (b.id === id ? { ...fn(b), updatedAt: new Date().toISOString() } : b)),
  });

  const actions: BoardActions = {
    createGroup: (name) => {
      const id = nextTempId();
      setState((s) => ({ ...s, groups: [...s.groups, { id, name }] }));
      enqueue(() => api<Group>("POST", "/api/groups", { name }).then(created(id)));
      selectGroup(id);
    },
    renameGroup: (id, name) => {
      setState((s) => ({ ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)) }));
      enqueue(() => api("PATCH", `/api/groups/${realId(id)}`, { name }));
    },
    deleteGroup: (id) => {
      const rest = state.groups.filter((g) => g.id !== id);
      setSelectedGroup(rest[0]?.id ?? null);
      setState((s) => ({
        ...s,
        groups: s.groups.filter((g) => g.id !== id),
        blocks: s.blocks.filter((b) => b.groupId !== id),
      }));
      enqueue(() => api("DELETE", `/api/groups/${realId(id)}`));
    },
    createBlock: (groupId) => {
      const id = nextTempId();
      const block: Block = { id, groupId, title: "", updatedAt: new Date().toISOString(), items: [] };
      setState((s) => ({ ...s, blocks: [block, ...s.blocks] }));
      setFocusBlockId(id);
      enqueue(() => api<Block>("POST", "/api/blocks", { groupId: realId(groupId) }).then(created(id)));
    },
    updateBlock: (id, patch) => {
      setState((s) => mapBlock(s, id, (b) => ({ ...b, ...patch })));
      enqueue(() =>
        api("PATCH", `/api/blocks/${realId(id)}`, {
          ...patch,
          groupId: patch.groupId === undefined ? undefined : realId(patch.groupId),
        }),
      );
    },
    deleteBlock: (id) => {
      setState((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }));
      enqueue(() => api("DELETE", `/api/blocks/${realId(id)}`));
    },
    addItem: (blockId, text) => {
      const id = nextTempId();
      setState((s) => mapBlock(s, blockId, (b) => ({ ...b, items: [...b.items, { id, text }] })));
      enqueue(() => api<Item>("POST", `/api/blocks/${realId(blockId)}/items`, { text }).then(created(id)));
    },
    updateItem: (blockId, itemId, text) => {
      setState((s) =>
        mapBlock(s, blockId, (b) => ({ ...b, items: b.items.map((i) => (i.id === itemId ? { ...i, text } : i)) })),
      );
      enqueue(() => api("PATCH", `/api/items/${realId(itemId)}`, { text }));
    },
    deleteItem: (blockId, itemId) => {
      setState((s) => mapBlock(s, blockId, (b) => ({ ...b, items: b.items.filter((i) => i.id !== itemId) })));
      enqueue(() => api("DELETE", `/api/items/${realId(itemId)}`));
    },
    copy: (text) =>
      copyText(text)
        .then(() => show("복사했어요"))
        .catch(() => show("복사하지 못했어요", true)),
  };

  const left = state.daily.filter((t) => !t.done).length + state.weekly.filter((t) => !t.done).length;

  return (
    <div className="app" data-tab={tab}>
      <header className="topbar">
        <h1>메모</h1>
        <span className="muted small">{formatDay(state.today)}</span>
        <span className="spacer" />
        <form action={logout}>
          <button type="submit" className="link muted small">
            로그아웃
          </button>
        </form>
      </header>

      <nav className="tabs" aria-label="화면 선택">
        <button type="button" aria-pressed={tab === "todo"} onClick={() => selectTab("todo")}>
          할 일 {left > 0 ? <span className="tab-count">{left}</span> : null}
        </button>
        <button type="button" aria-pressed={tab === "prompts"} onClick={() => selectTab("prompts")}>
          프롬프트 블록
        </button>
      </nav>

      <div className="panes">
        <div className="pane pane-todo">
          <TaskList
            kind="daily"
            title="오늘"
            subtitle="자정에 남은 일은 내일로"
            tasks={state.daily}
            inputRef={dailyInput}
            onAdd={addTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
          <TaskList
            kind="weekly"
            title="이번 주"
            subtitle={`${formatWeek(state.weekStart)} · 일요일 자정에 다음 주로`}
            tasks={state.weekly}
            onAdd={addTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        </div>
        <div className="pane pane-prompts">
          <PromptBoard
            groups={state.groups}
            blocks={state.blocks}
            selected={selectedGroup}
            onSelect={selectGroup}
            focusBlockId={focusBlockId}
            actions={actions}
          />
        </div>
      </div>

      {toast ? (
        <div className={toast.error ? "toast error" : "toast"} role="status">
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
