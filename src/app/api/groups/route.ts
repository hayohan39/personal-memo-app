import { handler, readJson, requireText } from "@/lib/api";
import { createGroup } from "@/lib/memo";

export const POST = handler(async (req) => {
  const body = await readJson(req);
  return createGroup(requireText(body.name, "name").trim());
});
