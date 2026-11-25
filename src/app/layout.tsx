import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Ai Planner", template: "%s · Ai Planner" },
  description: "Sổ kế hoạch tuần: mỗi người một tài khoản, ghi việc theo ngày, tích khi xong và xem tiến độ cả tuần.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1727" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The account's theme, mirrored into a cookie at sign-in, so the first paint has the right colours.
  const theme = (await cookies()).get("aip_theme")?.value;
  return (
    <html lang="vi" data-theme={theme === "light" || theme === "dark" ? theme : undefined}>
      <body>
        <a className="skip-link" href="#main">
          Bỏ qua, tới nội dung chính
        </a>
        {children}
      </body>
    </html>
  );
}
