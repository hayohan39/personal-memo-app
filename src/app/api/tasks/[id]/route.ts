import { handler, HttpError, notFound, parseId, readJson, requireText } from "@/lib/api";
import { deleteTask, moveTask, updateTask } from "@/lib/memo";

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  const taskId = parseId(id);
  // 일간 ↔ 주간 이동
  if (body.kind !== undefined) {
    if (body.kind !== "daily" && body.kind !== "weekly") throw new HttpError(400, "kind 는 daily 또는 weekly 입니다.");
    const task = await moveTask(taskId, body.kind, new Date());
    notFound(task);
    return task;
  }
  if (body.done !== undefined && typeof body.done !== "boolean") throw new HttpError(400, "done 은 true/false 입니다.");
  const text = body.text === undefined ? undefined : requireText(body.text).trim();
  const task = await updateTask(taskId, { text, done: body.done as boolean | undefined });
  notFound(task);
  return task;
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteTask(parseId(id));
});
