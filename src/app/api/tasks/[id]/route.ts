import { handler, HttpError, notFound, parseId, readJson, requireText } from "@/lib/api";
import { deleteTask, updateTask } from "@/lib/memo";

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  if (body.done !== undefined && typeof body.done !== "boolean") throw new HttpError(400, "done 은 true/false 입니다.");
  const text = body.text === undefined ? undefined : requireText(body.text).trim();
  const task = await updateTask(parseId(id), { text, done: body.done as boolean | undefined });
  notFound(task);
  return task;
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteTask(parseId(id));
});
