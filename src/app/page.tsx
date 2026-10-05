import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MemoApp } from "@/components/memo-app";
import { isAuthenticated } from "@/lib/api";
import { hasDatabase } from "@/lib/db";
import { loadState } from "@/lib/memo";
import { GROUP_COOKIE, TAB_COOKIE } from "@/lib/prefs";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isAuthenticated())) redirect("/login");
  if (!hasDatabase()) {
    return (
      <main className="login">
        <p className="error">DATABASE_URL 이 설정되지 않았습니다.</p>
      </main>
    );
  }

  const store = await cookies();
  const savedTab = store.get(TAB_COOKIE)?.value;
  const tab = savedTab === "prompts" || savedTab === "notes" ? savedTab : "todo";
  const group = Number(store.get(GROUP_COOKIE)?.value) || null;

  return <MemoApp initial={await loadState(new Date())} initialTab={tab} initialGroup={group} />;
}
