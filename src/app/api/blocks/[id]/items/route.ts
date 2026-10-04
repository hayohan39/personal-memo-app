import { handler, notFound, parseId, readJson, requireText } from "@/lib/api";
import { createItem } from "@/lib/memo";

export const POST = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  const item = await createItem(parseId(id), requireText(body.text).trim());
  notFound(item);
  return item;
});
