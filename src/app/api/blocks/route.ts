import { handler, notFound, optionalText, parseId, readJson } from "@/lib/api";
import { createBlock } from "@/lib/memo";

export const POST = handler(async (req) => {
  const body = await readJson(req);
  const block = await createBlock(parseId(String(body.groupId)), optionalText(body.title, "title") ?? "");
  notFound(block);
  return block;
});
