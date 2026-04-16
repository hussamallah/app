import { GeistSans } from "geist/font/sans";
import { Analytics } from "@vercel/analytics/react"
import { Suspense } from "react";
import "./../styles/globals.css";

import TopNav from "@/components/TopNav";
import GlobalMenu from "@/components/GlobalMenu";

export const metadata = {
  title: "Ground Zero",
  description: "Your deterministic identity blueprint",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-black">
        <Suspense fallback={null}>
          <TopNav />
        </Suspense>
        <GlobalMenu />
        {children}
        <Analytics />
      </body>
    </html>
  );
}


