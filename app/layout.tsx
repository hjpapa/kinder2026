import type { Metadata } from "next";
import "./globals.css";

const metadataOrigin = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(metadataOrigin),
  title: {
    default: "도담비서 : 누리",
    template: "%s | 도담비서 : 누리",
  },
  description: "교사의 생각을 놀이 기록, 행사 계획과 결과 보고 문서로 잇는 유치원 교사용 AI 업무 도우미",
  openGraph: {
    title: "도담비서 : 누리",
    description: "교사의 생각을 문서로 잇는 AI 업무 도우미",
    type: "website",
    locale: "ko_KR",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "도담비서 : 누리" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "도담비서 : 누리",
    description: "교사의 생각을 문서로 잇는 AI 업무 도우미",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
