"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkPassword,
  createSessionToken,
  getAppPassword,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = getAppPassword();
  if (!password) return { error: "서버에 APP_PASSWORD 환경변수가 설정되지 않았습니다." };

  const input = String(formData.get("password") ?? "");
  if (!checkPassword(input, password)) {
    // 무차별 대입을 조금이라도 늦춘다.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "비밀번호가 맞지 않습니다." };
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
