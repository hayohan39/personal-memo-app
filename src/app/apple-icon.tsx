import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS 홈 화면 아이콘(SVG 를 쓰지 못한다).
export default function AppleIcon() {
  const line = (width: number) => ({ width, height: 16, borderRadius: 8, background: "#fff" });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#d97757",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
          paddingLeft: 46,
        }}
      >
        <div style={line(88)} />
        <div style={line(88)} />
        <div style={line(56)} />
      </div>
    ),
    size,
  );
}
