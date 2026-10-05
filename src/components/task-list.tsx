"use client";

import type { Ref } from "react";
import type { Task } from "@/lib/memo";
import { carryLabel, type TaskKind } from "@/lib/period";
import { EditableText } from "./editable-text";
import { QuickInput } from "./quick-input";

type Props = {
  kind: TaskKind;
  title: string;
  subtitle: string;
  tasks: Task[];
  inputRef?: Ref<HTMLTextAreaElement>;
  onAdd: (kind: TaskKind, text: string) => void;
  onUpdate: (task: Task, patch: { text?: string; done?: boolean }) => void;
  onDelete: (task: Task) => void;
  /** 일간 ↔ 주간으로 옮긴다. */
  onMove: (task: Task) => void;
};

export function TaskList({ kind, title, subtitle, tasks, inputRef, onAdd, onUpdate, onDelete, onMove }: Props) {
  // 미완료가 위, 완료는 아래로.
  const sorted = [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)];
  const left = tasks.filter((t) => !t.done).length;

  return (
    <section className="card">
      <header className="card-head">
        <h2>{title}</h2>
        <span className="muted small">{subtitle}</span>
        <span className="count" aria-label={`남은 할 일 ${left}개`}>
          {left}/{tasks.length}
        </span>
      </header>
      <QuickInput
        placeholder={kind === "daily" ? "오늘 할 일 입력 후 +" : "이번 주 할 일 입력 후 +"}
        ref={inputRef}
        onSubmit={(text) => onAdd(kind, text)}
      />
      {sorted.length === 0 ? (
        <p className="empty">아직 없어요.</p>
      ) : (
        <ul className="tasks">
          {sorted.map((task) => {
            const carry = carryLabel(kind, task.firstPeriod, task.periodStart);
            return (
              <li key={task.id} className={task.done ? "task done" : "task"}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={(e) => onUpdate(task, { done: e.target.checked })}
                  aria-label={`${task.text} 완료`}
                />
                <EditableText
                  value={task.text}
                  label="할 일"
                  onSave={(text) => onUpdate(task, { text })}
                  onEmpty={() => onDelete(task)}
                />
                {carry && !task.done ? (
                  <span className="badge" title="완료하지 못해 넘어온 할 일">
                    {carry}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="move-btn"
                  title={kind === "daily" ? "이번 주 할 일로 옮기기" : "오늘 할 일로 옮기기"}
                  onClick={() => onMove(task)}
                >
                  {kind === "daily" ? "→ 주간" : "→ 오늘"}
                </button>
                <button type="button" className="icon-btn" aria-label="삭제" onClick={() => onDelete(task)}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
