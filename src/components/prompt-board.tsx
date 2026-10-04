"use client";

import { useState } from "react";
import type { Block, Group } from "@/lib/memo";
import { BlockCard } from "./block-card";

export type BoardActions = {
  createGroup: (name: string) => void;
  renameGroup: (id: number, name: string) => void;
  deleteGroup: (id: number) => void;
  createBlock: (groupId: number) => void;
  updateBlock: (id: number, patch: { title?: string; groupId?: number }) => void;
  deleteBlock: (id: number) => void;
  addItem: (blockId: number, text: string) => void;
  updateItem: (blockId: number, itemId: number, text: string) => void;
  deleteItem: (blockId: number, itemId: number) => void;
  copy: (text: string) => void;
};

type Props = {
  groups: Group[];
  blocks: Block[];
  selected: number | null;
  onSelect: (id: number) => void;
  focusBlockId: number | null;
  actions: BoardActions;
};

export function PromptBoard({ groups, blocks, selected, onSelect, focusBlockId, actions }: Props) {
  const [adding, setAdding] = useState(false);
  const group = groups.find((g) => g.id === selected) ?? null;
  const visible = group ? blocks.filter((b) => b.groupId === group.id) : [];

  return (
    <section className="prompts">
      <nav className="chips" aria-label="그룹">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            className={g.id === group?.id ? "chip active" : "chip"}
            aria-pressed={g.id === group?.id}
            onClick={() => onSelect(g.id)}
          >
            {g.name}
            <span className="chip-count">{blocks.filter((b) => b.groupId === g.id).length}</span>
          </button>
        ))}
        {adding ? (
          <input
            className="chip-input"
            autoFocus
            placeholder="그룹 이름"
            aria-label="새 그룹 이름"
            onBlur={(e) => {
              if (e.target.value.trim()) actions.createGroup(e.target.value.trim());
              setAdding(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = "";
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <button type="button" className="chip ghost" onClick={() => setAdding(true)}>
            + 그룹
          </button>
        )}
      </nav>

      {group ? (
        <>
          <div className="group-bar">
            <button type="button" className="btn primary" onClick={() => actions.createBlock(group.id)}>
              + 새 블록
            </button>
            <span className="spacer" />
            <button
              type="button"
              className="link"
              onClick={() => {
                const name = window.prompt("그룹 이름", group.name)?.trim();
                if (name && name !== group.name) actions.renameGroup(group.id, name);
              }}
            >
              이름 변경
            </button>
            <button
              type="button"
              className="link danger"
              onClick={() => {
                const message =
                  visible.length > 0
                    ? `"${group.name}" 그룹과 안의 블록 ${visible.length}개를 모두 삭제할까요?`
                    : `"${group.name}" 그룹을 삭제할까요?`;
                if (window.confirm(message)) actions.deleteGroup(group.id);
              }}
            >
              그룹 삭제
            </button>
          </div>

          {visible.length === 0 ? (
            <p className="empty">
              블록이 없어요. <b>+ 새 블록</b>을 눌러 세션에 보낼 할 일을 모아 보세요.
            </p>
          ) : (
            visible.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                groups={groups}
                focus={block.id === focusBlockId}
                onTitle={(title) => actions.updateBlock(block.id, { title })}
                onMove={(groupId) => actions.updateBlock(block.id, { groupId })}
                onDelete={() => actions.deleteBlock(block.id)}
                onAddItem={(text) => actions.addItem(block.id, text)}
                onUpdateItem={(itemId, text) => actions.updateItem(block.id, itemId, text)}
                onDeleteItem={(itemId) => actions.deleteItem(block.id, itemId)}
                onCopy={actions.copy}
              />
            ))
          )}
        </>
      ) : (
        <p className="empty">그룹을 먼저 만들어 주세요. 프로젝트별로 나눠 두면 찾기 쉬워요.</p>
      )}
    </section>
  );
}
