import { handler, notFound, optionalText, parseId, readJson } from "@/lib/api";
import { deleteBlock, updateBlock } from "@/lib/memo";

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  const ok = await updateBlock(parseId(id), {
    title: optionalText(body.title, "title"),
    groupId: body.groupId === undefined ? undefined : parseId(String(body.groupId)),
  });
  notFound(ok);
  return { ok };
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteBlock(parseId(id));
});
