// 마지막으로 본 탭/그룹은 쿠키에 둔다. 서버가 첫 화면부터 그 상태로 그려서 깜빡임이 없다.
// (서버 컴포넌트에서도 읽으므로 "use client" 모듈이 아닌 여기에 둔다.)
export type Tab = "todo" | "prompts" | "notes";
export const TAB_COOKIE = "memo_tab";
export const GROUP_COOKIE = "memo_group";
