import { handler, HttpError, notFound, parseId, readJson } from "@/lib/api";
import { updateBlock } from "@/lib/memo";

// 블록은 프로젝트와 함께 생기고 지워진다. 여기서는 설정(앞·뒤 문구 사용)만 바꾼다.
export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  if (typeof body.useWrap !== "boolean") throw new HttpError(400, "useWrap 은 true/false 입니다.");
  const ok = await updateBlock(parseId(id), { useWrap: body.useWrap });
  notFound(ok);
  return { ok };
});
