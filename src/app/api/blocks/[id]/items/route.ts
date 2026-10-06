import { handler, notFound, parseId, readJson, requireText } from "@/lib/api";
import { clearBlock, createItem } from "@/lib/memo";

export const POST = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  const item = await createItem(parseId(id), requireText(body.text).trim());
  notFound(item);
  return item;
});

/** 비우기: 블록의 항목을 모두 지운다. */
export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  notFound(await clearBlock(parseId(id)));
});
