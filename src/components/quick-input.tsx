"use client";

import { forwardRef, useState } from "react";
import { autosize } from "./client";

type Props = {
  placeholder: string;
  onSubmit: (text: string) => void;
  /** true 면 Shift+Enter 로 줄바꿈할 수 있다. */
  multiline?: boolean;
};

/** Enter 로 바로 추가하는 입력칸. 추가 후에도 포커스가 남아 연달아 입력할 수 있다. */
export const QuickInput = forwardRef<HTMLTextAreaElement, Props>(function QuickInput(
  { placeholder, onSubmit, multiline = false },
  ref,
) {
  const [value, setValue] = useState("");

  const submit = (el: HTMLTextAreaElement) => {
    const text = value.trim();
    if (!text) return;
    // 여러 줄을 붙여넣은 한 줄짜리 입력은 줄마다 따로 추가한다.
    const parts = multiline ? [text] : text.split("\n").map((t) => t.trim()).filter(Boolean);
    parts.forEach(onSubmit);
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
        enterKeyHint="enter"
        onChange={(e) => {
          setValue(e.target.value);
          autosize(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
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
        onMouseDown={(e) => e.preventDefault()}
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
