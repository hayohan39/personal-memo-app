"use client";

import { useEffect, useRef, useState } from "react";
import { formatBlock } from "@/lib/copy";
import type { Block, Group } from "@/lib/memo";
import { EditableText } from "./editable-text";
import { QuickInput } from "./quick-input";

type Props = {
  block: Block;
  /** 블록이 속한 프로젝트(앞·뒤 문구) */
  group: Group;
  groups: Group[];
  focus: boolean;
  onTitle: (title: string) => void;
  onUseWrap: (useWrap: boolean) => void;
  onMove: (groupId: number) => void;
  onDelete: () => void;
  onAddItem: (text: string) => void;
  onUpdateItem: (itemId: number, text: string) => void;
  onDeleteItem: (itemId: number) => void;
  onCopy: (text: string) => void;
};

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

export function BlockCard(props: Props) {
  const { block, group, groups, focus } = props;
  const hasWrap = Boolean(group.prefix.trim() || group.suffix.trim());
  const wrap = hasWrap && block.useWrap ? { prefix: group.prefix, suffix: group.suffix } : undefined;
  const [title, setTitle] = useState(block.title);
  const saved = useRef(block.title);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focus) inputRef.current?.focus();
  }, [focus]);

  // 제목은 입력을 멈추면 자동 저장한다.
  const saveTitle = (next: string) => {
    clearTimeout(timer.current);
    if (next === saved.current) return;
    saved.current = next;
    props.onTitle(next);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const copyAll = () => props.onCopy(formatBlock(title, block.items.map((i) => i.text), wrap));

  return (
    <article className="card block">
      <div className="block-head">
        <input
          className="block-title"
          value={title}
          placeholder="블록 제목 (선택)"
          aria-label="블록 제목"
          onChange={(e) => {
            const next = e.target.value;
            setTitle(next);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => saveTitle(next), 600);
          }}
          onBlur={() => saveTitle(title)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) inputRef.current?.focus();
          }}
        />
        <button
          type="button"
          className="btn primary copy"
          onClick={copyAll}
          disabled={block.items.length === 0}
          title={wrap ? "앞 문구 + 블록 + 뒤 문구를 복사" : "블록 전체를 번호 목록으로 복사"}
        >
          전체 복사
        </button>
      </div>

      {block.items.length > 0 ? (
        <ol className="items">
          {block.items.map((item, index) => (
            <li key={item.id} className="item">
              <span className="num">{index + 1}.</span>
              <EditableText
                value={item.text}
                label="프롬프트 항목"
                onSave={(text) => props.onUpdateItem(item.id, text)}
                onEmpty={() => props.onDeleteItem(item.id)}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="이 항목 복사"
                title="이 항목만 복사"
                onClick={() => props.onCopy(item.text)}
              >
                ⧉
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="항목 삭제"
                onClick={() => props.onDeleteItem(item.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <QuickInput
        ref={inputRef}
        placeholder="항목 입력 후 +"
        onSubmit={props.onAddItem}
      />

      <footer className="block-foot muted small">
        <span>
          {block.items.length}개 · {timeFormat.format(new Date(block.updatedAt))}
        </span>
        <span className="spacer" />
        {hasWrap ? (
          <label className="wrap-toggle" title="전체 복사 때 프로젝트의 앞·뒤 문구를 붙여요">
            <input type="checkbox" checked={block.useWrap} onChange={(e) => props.onUseWrap(e.target.checked)} />
            앞뒤 문구
          </label>
        ) : null}
        {groups.length > 1 ? (
          <select
            aria-label="다른 프로젝트로 옮기기"
            value=""
            onChange={(e) => {
              if (e.target.value) props.onMove(Number(e.target.value));
            }}
          >
            <option value="">이동…</option>
            {groups
              .filter((g) => g.id !== block.groupId)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  → {g.name}
                </option>
              ))}
          </select>
        ) : null}
        <button
          type="button"
          className="link danger"
          onClick={() => {
            if (window.confirm("이 블록을 삭제할까요?")) props.onDelete();
          }}
        >
          삭제
        </button>
      </footer>
    </article>
  );
}
