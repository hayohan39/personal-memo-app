import { handler, HttpError, notFound, optionalText, parseId, readJson } from "@/lib/api";
import { deleteBlock, updateBlock } from "@/lib/memo";

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  if (body.useWrap !== undefined && typeof body.useWrap !== "boolean") {
    throw new HttpError(400, "useWrap 은 true/false 입니다.");
  }
  const ok = await updateBlock(parseId(id), {
    title: optionalText(body.title, "title"),
    groupId: body.groupId === undefined ? undefined : parseId(String(body.groupId)),
    useWrap: body.useWrap as boolean | undefined,
  });
  notFound(ok);
  return { ok };
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteBlock(parseId(id));
});
