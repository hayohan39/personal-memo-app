import { handler, notFound, optionalText, parseId, readJson, requireText } from "@/lib/api";
import { deleteGroup, updateGroup } from "@/lib/memo";

// 프로젝트 이름과 전체 복사 앞·뒤 문구를 고친다.
export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  const group = await updateGroup(parseId(id), {
    name: body.name === undefined ? undefined : requireText(body.name, "name").trim(),
    prefix: optionalText(body.prefix, "prefix"),
    suffix: optionalText(body.suffix, "suffix"),
  });
  notFound(group);
  return group;
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteGroup(parseId(id));
});
