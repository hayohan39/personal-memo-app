import type { MetadataRoute } from "next";

// 휴대폰 홈 화면에 추가하면 앱처럼 열린다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "메모",
    short_name: "메모",
    description: "Claude 프롬프트 블록과 일간/주간 할 일",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f4",
    theme_color: "#f6f6f4",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
