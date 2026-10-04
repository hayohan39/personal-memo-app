"use client";

import { forwardRef, useState } from "react";
import { autosize } from "./client";

type Props = {
  placeholder: string;
  onSubmit: (text: string) => void;
};

/**
 * 할 일·항목 입력칸. Enter 는 줄바꿈이고, + 버튼이나 Ctrl/⌘+Enter 로 추가한다.
 * 추가한 뒤에도 포커스가 남아 연달아 입력할 수 있다.
 */
export const QuickInput = forwardRef<HTMLTextAreaElement, Props>(function QuickInput({ placeholder, onSubmit }, ref) {
  const [value, setValue] = useState("");

  const submit = (el: HTMLTextAreaElement) => {
    const text = value.trim();
    if (!text) return;
    onSubmit(text);
    setValue("");
    requestAnimationFrame(() => autosize(el));
  };

  return (
    <div className="quick-input">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        placeholder={placeholder}
        aria-label={placeholder}
        title="Enter 줄바꿈 · Ctrl(⌘)+Enter 또는 + 로 추가"
        onChange={(e) => {
          setValue(e.target.value);
          autosize(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit(e.currentTarget);
          }
        }}
      />
      <button
        type="button"
        className="btn add"
        aria-label="추가"
        disabled={!value.trim()}
        // 버튼을 눌러도 입력칸 포커스(휴대폰 키보드)가 유지되게 한다.
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => {
          const el = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
          submit(el);
          el.focus();
        }}
      >
        +
      </button>
    </div>
  );
});
