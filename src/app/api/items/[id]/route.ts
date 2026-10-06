import { handler, notFound, parseId, readJson, requireText } from "@/lib/api";
import { deleteItem, moveItem, updateItem } from "@/lib/memo";

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  // 다른 프로젝트의 블록으로 옮기기
  const item =
    body.blockId !== undefined
      ? await moveItem(parseId(id), parseId(String(body.blockId)))
      : await updateItem(parseId(id), requireText(body.text).trim());
  notFound(item);
  return item;
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteItem(parseId(id));
});
