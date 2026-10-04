import { handler } from "@/lib/api";
import { loadState } from "@/lib/memo";

export const dynamic = "force-dynamic";

export const GET = handler(async () => loadState(new Date()));
