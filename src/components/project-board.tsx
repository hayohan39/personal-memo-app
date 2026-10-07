"use client";

import { useState } from "react";
import type { Block, Group } from "@/lib/memo";
import { BlockCard } from "./block-card";
import { useAutosave } from "./use-autosave";

export type BoardActions = {
  createGroup: (name: string) => void;
  updateGroup: (id: number, patch: { name?: string; prefix?: string; suffix?: string }) => void;
  deleteGroup: (id: number) => void;
  setUseWrap: (blockId: number, useWrap: boolean) => void;
  clearBlock: (blockId: number) => void;
  addItem: (blockId: number, text: string) => void;
  updateItem: (blockId: number, itemId: number, text: string) => void;
  deleteItem: (blockId: number, itemId: number) => void;
  moveItem: (blockId: number, itemId: number, groupId: number) => void;
  copy: (text: string) => void;
  notify: (text: string) => void;
};

type Props = {
  groups: Group[];
  blocks: Block[];
  selected: number | null;
  onSelect: (id: number) => void;
  focusBlockId: number | null;
  actions: BoardActions;
};

/** 프로젝트(드롭다운으로 선택)와 그 프로젝트의 프롬프트 블록 하나. */
export function ProjectBoard({ groups, blocks, selected, onSelect, focusBlockId, actions }: Props) {
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const group = groups.find((g) => g.id === selected) ?? null;
  const block = group ? blocks.find((b) => b.groupId === group.id) : undefined;

  const confirmDelete = () => {
    if (!group) return;
    const count = block?.items.length ?? 0;
    const message =
      count > 0
        ? `"${group.name}" 프로젝트와 항목 ${count}개를 모두 삭제할까요?`
        : `"${group.name}" 프로젝트를 삭제할까요?`;
    if (!window.confirm(message)) return;
    setSettingsOpen(false);
    actions.deleteGroup(group.id);
  };

  return (
    <section className="prompts">
      <div className="project-bar">
        {adding ? (
          <input
            className="project-input"
            autoFocus
            placeholder="새 프로젝트 이름"
            aria-label="새 프로젝트 이름"
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
          <select
            className="project-select"
            aria-label="프로젝트 선택"
            value={group?.id ?? ""}
            onChange={(e) => onSelect(Number(e.target.value))}
          >
            {group ? null : <option value="">프로젝트를 만들어 주세요</option>}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="btn" onClick={() => setAdding(true)} title="새 프로젝트 만들기">
          + 추가
        </button>
        {group ? (
          <button
            type="button"
            className={settingsOpen ? "btn active" : "btn"}
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
            title="이름, 복사 앞·뒤 문구"
          >
            설정
          </button>
        ) : null}
        {group ? (
          <button type="button" className="btn danger" onClick={confirmDelete} title="이 프로젝트 삭제">
            삭제
          </button>
        ) : null}
      </div>

      {group && settingsOpen ? (
        <ProjectSettings
          key={group.id}
          group={group}
          onSave={(patch) => actions.updateGroup(group.id, patch)}
        />
      ) : null}

      {group && block ? (
        <BlockCard
          key={block.id}
          block={block}
          group={group}
          groups={groups}
          focus={block.id === focusBlockId}
          onUseWrap={(useWrap) => actions.setUseWrap(block.id, useWrap)}
          onClear={() => actions.clearBlock(block.id)}
          onAddItem={(text) => actions.addItem(block.id, text)}
          onUpdateItem={(itemId, text) => actions.updateItem(block.id, itemId, text)}
          onDeleteItem={(itemId) => actions.deleteItem(block.id, itemId)}
          onMoveItem={(itemId, groupId) => {
            actions.moveItem(block.id, itemId, groupId);
            const target = groups.find((g) => g.id === groupId);
            actions.notify(`"${target?.name ?? "다른 프로젝트"}"(으)로 옮겼어요`);
          }}
          onCopy={actions.copy}
        />
      ) : (
        <p className="empty">프로젝트를 먼저 만들어 주세요. 프로젝트별로 나눠 두면 찾기 쉬워요.</p>
      )}
    </section>
  );
}

type SettingsProps = {
  group: Group;
  onSave: (patch: { name?: string; prefix?: string; suffix?: string }) => void;
};

/** 프로젝트 이름과 전체 복사 앞·뒤 문구. 입력을 멈추면 자동 저장. */
function ProjectSettings({ group, onSave }: SettingsProps) {
  const [name, setName] = useState(group.name);
  const [prefix, setPrefix] = useState(group.prefix);
  const [suffix, setSuffix] = useState(group.suffix);
  const nameSave = useAutosave((v: string) => v.trim() && onSave({ name: v.trim() }));
  const prefixSave = useAutosave((v: string) => onSave({ prefix: v }));
  const suffixSave = useAutosave((v: string) => onSave({ suffix: v }));

  return (
    <div className="card project-settings">
      <label className="field">
        <span>프로젝트 이름</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            nameSave.schedule(e.target.value);
          }}
          onBlur={nameSave.flush}
        />
      </label>
      <label className="field">
        <span>
          앞 문구 <em className="muted">· 지시 설명, 전체 복사 때 맨 앞에 붙어요</em>
        </span>
        <textarea
          rows={3}
          value={prefix}
          placeholder="예: 아래 작업을 순서대로 진행해줘. 애매한 부분은 먼저 물어봐."
          onChange={(e) => {
            setPrefix(e.target.value);
            prefixSave.schedule(e.target.value);
          }}
          onBlur={prefixSave.flush}
        />
      </label>
      <label className="field">
        <span>
          뒤 문구 <em className="muted">· 추가 요청, 전체 복사 때 맨 뒤에 붙어요</em>
        </span>
        <textarea
          rows={3}
          value={suffix}
          placeholder="예: 끝나면 PR 을 만들고 변경 사항을 요약해줘."
          onChange={(e) => {
            setSuffix(e.target.value);
            suffixSave.schedule(e.target.value);
          }}
          onBlur={suffixSave.flush}
        />
      </label>
      <p className="muted small settings-foot">자동 저장돼요</p>
    </div>
  );
}
