import { handler, notFound, parseId, readJson, requireText } from "@/lib/api";
import { deleteItem, updateItem } from "@/lib/memo";

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  const item = await updateItem(parseId(id), requireText(body.text).trim());
  notFound(item);
  return item;
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteItem(parseId(id));
});
