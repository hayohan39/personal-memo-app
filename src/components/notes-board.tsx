"use client";

import { useEffect, useRef, useState } from "react";
import type { Note } from "@/lib/memo";
import { autosize } from "./client";
import { useAutosave } from "./use-autosave";

export type NoteActions = {
  create: () => number;
  update: (id: number, patch: { title?: string; body?: string }) => void;
  remove: (id: number) => void;
};

type Props = { notes: Note[]; actions: NoteActions };

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

/** 자유 양식 메모. 목록에서 골라 열고, 입력을 멈추면 자동 저장. */
export function NotesBoard({ notes, actions }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const open = notes.find((n) => n.id === openId) ?? null;

  if (open) {
    return <NoteEditor key={open.id} note={open} actions={actions} onClose={() => setOpenId(null)} />;
  }

  // 최근에 고친 메모가 위로
  const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <section className="notes">
      <div className="group-bar">
        <button type="button" className="btn primary" onClick={() => setOpenId(actions.create())}>
          + 새 메모
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="empty">메모가 없어요. 생각나는 것을 자유롭게 적어 두세요.</p>
      ) : (
        <ul className="note-list">
          {sorted.map((n) => {
            const firstLine = n.body.trim().split("\n")[0];
            return (
              <li key={n.id}>
                <button type="button" className="note-row" onClick={() => setOpenId(n.id)}>
                  <span className="note-title">{n.title.trim() || firstLine || "제목 없음"}</span>
                  <span className="note-preview muted small">
                    {timeFormat.format(new Date(n.updatedAt))}
                    {n.title.trim() && firstLine ? ` · ${firstLine}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NoteEditor({ note, actions, onClose }: { note: Note; actions: NoteActions; onClose: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [isNew] = useState(!note.title && !note.body);
  const titleSave = useAutosave((v: string) => actions.update(note.id, { title: v }));
  const bodySave = useAutosave((v: string) => actions.update(note.id, { body: v }));

  useEffect(() => {
    autosize(bodyRef.current);
    // 새 메모는 바로 쓸 수 있게
    if (isNew) bodyRef.current?.focus();
  }, [isNew]);

  const close = () => {
    titleSave.flush();
    bodySave.flush();
    // 아무것도 안 쓴 메모는 남기지 않는다
    if (!title.trim() && !body.trim()) actions.remove(note.id);
    onClose();
  };

  return (
    <section className="card note-editor">
      <div className="note-head">
        <button type="button" className="link" onClick={close}>
          ← 목록
        </button>
        <span className="spacer" />
        <span className="muted small">자동 저장</span>
        <button
          type="button"
          className="link danger"
          onClick={() => {
            if (window.confirm("이 메모를 삭제할까요?")) {
              // 남은 저장을 먼저 보내야 삭제 뒤에 저장 요청이 가지 않는다.
              titleSave.flush();
              bodySave.flush();
              actions.remove(note.id);
              onClose();
            }
          }}
        >
          삭제
        </button>
      </div>
      <input
        className="note-title-input"
        value={title}
        placeholder="제목"
        aria-label="메모 제목"
        onChange={(e) => {
          setTitle(e.target.value);
          titleSave.schedule(e.target.value);
        }}
        onBlur={titleSave.flush}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) bodyRef.current?.focus();
        }}
      />
      <textarea
        ref={bodyRef}
        className="note-body"
        value={body}
        placeholder="자유롭게 적어 보세요"
        aria-label="메모 내용"
        onChange={(e) => {
          setBody(e.target.value);
          bodySave.schedule(e.target.value);
          autosize(e.target);
        }}
        onBlur={bodySave.flush}
      />
    </section>
  );
}
