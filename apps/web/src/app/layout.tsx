import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUBXVoice — typing is optional",
  description:
    "Hold a key, speak in any language, and clean text appears wherever your cursor is. For Mac and Windows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
