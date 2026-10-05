"use client";

import { useEffect, useRef } from "react";

/**
 * 입력을 멈추고 delay 가 지나면 save 를 부른다. 화면을 떠날 때(언마운트) 남은 값도 저장한다.
 * schedule(값) 으로 예약하고, flush() 로 즉시 저장한다(blur 등).
 */
export function useAutosave<T>(save: (value: T) => void, delay = 600) {
  const saveRef = useRef(save);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = () => {
    clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (next) saveRef.current(next.value);
  };

  const schedule = (value: T) => {
    pending.current = { value };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  // flush 는 ref 만 읽으므로 마운트 때 한 번 등록해도 최신 값을 저장한다.
  useEffect(() => () => flush(), []);

  return { schedule, flush };
}
