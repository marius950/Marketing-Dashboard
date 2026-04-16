import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "effi \u2013 KPI Dashboard",
  description: "effi Marketing KPI Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
