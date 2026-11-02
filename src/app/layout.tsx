import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/session";
import { isDevFallbackActive } from "@/lib/env";
import { Navbar } from "@/components/layout/navbar";
import { DevBanner } from "@/components/layout/dev-banner";
import { Footer } from "@/components/layout/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Debate — You Talk. They Talk. The Internet Decides.",
  description:
    "A competitive debate platform where people pick a side, challenge an opponent, book a time, show up, and let an audience vote.",
};

async function AppHeader() {
  const user = await getCurrentUser();

  return (
    <>
      {isDevFallbackActive && <DevBanner currentUser={user?.profile} />}
      <Navbar currentUser={user?.profile} />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF8F4] text-[#0B0D10]">
        <Suspense fallback={<Navbar currentUser={null} />}>
          <AppHeader />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
