import { handler, HttpError, readJson, requireText } from "@/lib/api";
import { createTask } from "@/lib/memo";

export const POST = handler(async (req) => {
  const body = await readJson(req);
  if (body.kind !== "daily" && body.kind !== "weekly") throw new HttpError(400, "kind 는 daily 또는 weekly 입니다.");
  return createTask(body.kind, requireText(body.text).trim(), new Date());
});
