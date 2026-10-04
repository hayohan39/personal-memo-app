"use client";

import { useEffect, useRef, useState } from "react";
import { autosize } from "./client";

type Props = {
  value: string;
  onSave: (text: string) => void;
  /** 비운 채로 저장하면 호출된다(보통 삭제). */
  onEmpty?: () => void;
  className?: string;
  label: string;
};

/** 누르면 바로 고칠 수 있는 텍스트. Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소. */
export function EditableText({ value, onSave, onEmpty, className, label }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    autosize(el);
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const text = draft.trim();
    if (!text) {
      if (onEmpty) onEmpty();
      else setDraft(value);
      return;
    }
    if (text !== value) onSave(text);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className={`editable ${className ?? ""}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label={`${label} 수정: ${value}`}
      >
        {value}
      </button>
    );
  }

  return (
    <textarea
      ref={ref}
      className={`editable-input ${className ?? ""}`}
      value={draft}
      rows={1}
      aria-label={label}
      onChange={(e) => {
        setDraft(e.target.value);
        autosize(e.target);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
    />
  );
}
