"use client";

import { useEffect, useRef } from "react";
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
  onUseWrap: (useWrap: boolean) => void;
  onClear: () => void;
  onAddItem: (text: string) => void;
  onUpdateItem: (itemId: number, text: string) => void;
  onDeleteItem: (itemId: number) => void;
  /** 항목을 다른 프로젝트로 옮긴다. */
  onMoveItem: (itemId: number, groupId: number) => void;
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

/** 프로젝트의 프롬프트 블록(프로젝트마다 하나). */
export function BlockCard(props: Props) {
  const { block, group, groups, focus } = props;
  const hasWrap = Boolean(group.prefix.trim() || group.suffix.trim());
  const wrap = hasWrap && block.useWrap ? { prefix: group.prefix, suffix: group.suffix } : undefined;
  const others = groups.filter((g) => g.id !== group.id);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focus) inputRef.current?.focus();
  }, [focus]);

  const copyAll = () => props.onCopy(formatBlock(block.items.map((i) => i.text), wrap));

  return (
    <article className="card block">
      <div className="block-head">
        <span className="muted small">
          {block.items.length > 0 ? `항목 ${block.items.length}개` : "세션에 보낼 할 일을 적어 보세요"}
        </span>
        <span className="spacer" />
        <button
          type="button"
          className="btn primary copy"
          onClick={copyAll}
          disabled={block.items.length === 0}
          title={wrap ? "앞 문구 + 항목 + 뒤 문구를 복사" : "항목 전체를 번호 목록으로 복사"}
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
              {others.length > 0 ? (
                <select
                  className="item-move"
                  aria-label="다른 프로젝트로 옮기기"
                  title="다른 프로젝트로 옮기기"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) props.onMoveItem(item.id, Number(e.target.value));
                  }}
                >
                  <option value="">↗</option>
                  {others.map((g) => (
                    <option key={g.id} value={g.id}>
                      → {g.name}
                    </option>
                  ))}
                </select>
              ) : null}
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

      <QuickInput ref={inputRef} placeholder="항목 입력 후 +" onSubmit={props.onAddItem} />

      <footer className="block-foot muted small">
        <span>{timeFormat.format(new Date(block.updatedAt))} 저장</span>
        <span className="spacer" />
        {hasWrap ? (
          <label className="wrap-toggle" title="전체 복사 때 프로젝트의 앞·뒤 문구를 붙여요">
            <input type="checkbox" checked={block.useWrap} onChange={(e) => props.onUseWrap(e.target.checked)} />
            앞뒤 문구
          </label>
        ) : null}
        {block.items.length > 0 ? (
          <button
            type="button"
            className="link danger"
            onClick={() => {
              if (window.confirm(`항목 ${block.items.length}개를 모두 지울까요?`)) props.onClear();
            }}
          >
            비우기
          </button>
        ) : null}
      </footer>
    </article>
  );
}
