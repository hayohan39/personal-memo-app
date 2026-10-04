import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인 · 메모" };

export default function LoginPage() {
  return (
    <main className="login">
      <h1>메모</h1>
      <LoginForm />
    </main>
  );
}
