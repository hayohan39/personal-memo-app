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

  // 다른 기기에서 고쳤거나 자정이 지났을 수 있으니, 다시 볼 때 새로 불러온다.
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== "visible" || Date.now() - loadedAt.current < 30_000) return;
      if (document.activeElement?.matches("textarea, input")) return; // 입력 중엔 건드리지 않는다
      try {
        const next = await api<MemoState>("GET", "/api/state");
        loadedAt.current = Date.now();
        setState(next);
      } catch {
        // 조용히 다음 기회에
      }
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const selectTab = (next: Tab) => {
    setTab(next);
    remember(TAB_COOKIE, next);
  };
  const selectGroup = (id: number) => {
    setSelectedGroup(id);
    remember(GROUP_COOKIE, String(id));
  };

  /** 화면을 먼저 바꾸고 저장한다. 실패하면 되돌린다. */
  const optimistic = async (apply: (s: MemoState) => MemoState, request: () => Promise<unknown>) => {
    let before: MemoState | undefined;
    setState((s) => {
      before = s;
      return apply(s);
    });
    try {
      await request();
    } catch (error) {
      if (before) setState(before);
      show(`저장 실패: ${(error as Error).message}`, true);
    }
  };

  const fail = (error: unknown) => show(`저장 실패: ${(error as Error).message}`, true);

  // ── 할 일 ──
  const mapTasks = (s: MemoState, kind: TaskKind, fn: (tasks: Task[]) => Task[]): MemoState => ({
    ...s,
    [kind]: fn(s[kind]),
  });

  const addTask = (kind: TaskKind, text: string) => {
    api<Task>("POST", "/api/tasks", { kind, text })
      .then((task) => setState((s) => mapTasks(s, kind, (ts) => [...ts, task])))
      .catch(fail);
  };
  const updateTask = (task: Task, patch: { text?: string; done?: boolean }) =>
    optimistic(
      (s) => mapTasks(s, task.kind, (ts) => ts.map((t) => (t.id === task.id ? { ...t, ...patch } : t))),
      () => api("PATCH", `/api/tasks/${task.id}`, patch),
    );
  const deleteTask = (task: Task) =>
    optimistic(
      (s) => mapTasks(s, task.kind, (ts) => ts.filter((t) => t.id !== task.id)),
      () => api("DELETE", `/api/tasks/${task.id}`),
    );

  // ── 프롬프트 블록 ──
  const mapBlock = (s: MemoState, id: number, fn: (b: Block) => Block): MemoState => ({
    ...s,
    blocks: s.blocks.map((b) => (b.id === id ? fn(b) : b)),
  });
  const touched = (b: Block): Block => ({ ...b, updatedAt: new Date().toISOString() });

  const actions: BoardActions = {
    createGroup: (name) =>
      api<Group>("POST", "/api/groups", { name })
        .then((group) => {
          setState((s) => ({ ...s, groups: [...s.groups, group] }));
          selectGroup(group.id);
        })
        .catch(fail),
    renameGroup: (id, name) =>
      optimistic(
        (s) => ({ ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)) }),
        () => api("PATCH", `/api/groups/${id}`, { name }),
      ),
    deleteGroup: (id) => {
      const rest = state.groups.filter((g) => g.id !== id);
      setSelectedGroup(rest[0]?.id ?? null);
      return optimistic(
        (s) => ({ ...s, groups: s.groups.filter((g) => g.id !== id), blocks: s.blocks.filter((b) => b.groupId !== id) }),
        () => api("DELETE", `/api/groups/${id}`),
      );
    },
    createBlock: (groupId) =>
      api<Block>("POST", "/api/blocks", { groupId })
        .then((block) => {
          setState((s) => ({ ...s, blocks: [block, ...s.blocks] }));
          setFocusBlockId(block.id);
        })
        .catch(fail),
    updateBlock: (id, patch) =>
      optimistic(
        (s) => mapBlock(s, id, (b) => touched({ ...b, ...patch })),
        () => api("PATCH", `/api/blocks/${id}`, patch),
      ),
    deleteBlock: (id) =>
      optimistic(
        (s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }),
        () => api("DELETE", `/api/blocks/${id}`),
      ),
    addItem: (blockId, text) =>
      api<Item>("POST", `/api/blocks/${blockId}/items`, { text })
        .then((item) => setState((s) => mapBlock(s, blockId, (b) => touched({ ...b, items: [...b.items, item] }))))
        .catch(fail),
    updateItem: (blockId, itemId, text) =>
      optimistic(
        (s) =>
          mapBlock(s, blockId, (b) =>
            touched({ ...b, items: b.items.map((i) => (i.id === itemId ? { ...i, text } : i)) }),
          ),
        () => api("PATCH", `/api/items/${itemId}`, { text }),
      ),
    deleteItem: (blockId, itemId) =>
      optimistic(
        (s) => mapBlock(s, blockId, (b) => touched({ ...b, items: b.items.filter((i) => i.id !== itemId) })),
        () => api("DELETE", `/api/items/${itemId}`),
      ),
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
