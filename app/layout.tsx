import type { Metadata } from "next";
import { Noto_Sans_KR, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/components/providers/SettingsProvider";

const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ['400', '500', '700'],
  variable: '--font-noto',
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm',
});

export const metadata: Metadata = {
  title: "서지관리 - AI 논문 분석 프로그램",
  description: "AI를 활용한 논문 PDF 자동 분석 및 체계적 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className={`${notoSans.variable} ${ibmPlex.variable} font-sans h-full overflow-hidden bg-[#faf9f5]`}>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}

