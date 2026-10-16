import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import DemoBanner from "@/components/DemoBanner";
import Nav from "@/components/Nav";
import { isDemoData } from "@/lib/sources";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-tc",
});

export const metadata: Metadata = {
  title: "愛棒球 CPBL 數據站",
  description: "中職球隊戰績、進階數據視覺化、AI 賽事預測與個人化追蹤",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${notoSansTC.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Nav />
        <DemoBanner />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:px-6">{children}</main>
        {isDemoData() && (
          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
            示範資料站，數據為模擬生成，僅供產品展示使用。
          </footer>
        )}
      </body>
    </html>
  );
}
