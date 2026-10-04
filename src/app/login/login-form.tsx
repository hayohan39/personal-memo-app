"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="login-form">
      <input
        type="password"
        name="password"
        placeholder="비밀번호"
        autoComplete="current-password"
        autoFocus
        required
        aria-label="비밀번호"
      />
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "확인 중…" : "들어가기"}
      </button>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    </form>
  );
}
