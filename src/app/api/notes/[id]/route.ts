import { handler, notFound, optionalText, parseId, readJson } from "@/lib/api";
import { deleteNote, updateNote } from "@/lib/memo";

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  const note = await updateNote(parseId(id), {
    title: optionalText(body.title, "title"),
    body: optionalText(body.body, "body"),
  });
  notFound(note);
  return note;
});

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  await deleteNote(parseId(id));
});
