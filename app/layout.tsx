import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AccessGate } from "@/components/access-gate";
import { ACCESS_COOKIE, hasAccessToken, isAccessRequired } from "@/lib/server/access";
import "./globals.css";

const metadataOrigin = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(metadataOrigin),
  title: {
    default: "교사의 AI 준비실",
    template: "%s | 교사의 AI 준비실",
  },
  description: "놀이 기록부터 행사 계획·결과 보고까지, AI가 초안을 만들고 교사가 확인하는 유치원 교사 업무 도구",
  openGraph: {
    title: "교사의 AI 준비실",
    description: "놀이 기록부터 행사 계획·결과 보고까지",
    type: "website",
    locale: "ko_KR",
    images: [{ url: "/og.png", width: 1735, height: 906, alt: "교사의 AI 준비실" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "교사의 AI 준비실",
    description: "놀이 기록부터 행사 계획·결과 보고까지",
    images: ["/og.png"],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const required = isAccessRequired();
  const cookieStore = await cookies();
  const authenticated = !required || hasAccessToken(cookieStore.get(ACCESS_COOKIE)?.value || "");
  return (
    <html lang="ko">
      <body><AccessGate initialState={{ required, authenticated }}>{children}</AccessGate></body>
    </html>
  );
}
