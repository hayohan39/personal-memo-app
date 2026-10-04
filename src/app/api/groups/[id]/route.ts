import { handler, notFound, parseId, readJson, requireText } from "@/lib/api";
import { deleteGroup, renameGroup } from "@/lib/memo";

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  const group = await renameGroup(parseId(id), requireText(body.name, "name").trim());
  notFound(group);
  return group;
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteGroup(parseId(id));
});
