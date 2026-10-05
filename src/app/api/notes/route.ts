import { handler, optionalText, readJson } from "@/lib/api";
import { createNote } from "@/lib/memo";

export const POST = handler(async (req) => {
  const body = await readJson(req);
  return createNote(optionalText(body.title, "title") ?? "", optionalText(body.body, "body") ?? "");
});
