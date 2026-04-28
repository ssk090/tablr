import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tablr — AI Social Dining for Bangalore",
  description:
    "Combat urban loneliness by matching professionals for communal dining experiences in Bangalore.",
};

import { QueryProvider } from "@/components/providers/query-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fraunces.variable} ${plusJakartaSans.variable} h-full antialiased dark`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
          <QueryProvider>
            <div className="relative min-h-screen">
              <div className="pointer-events-none fixed inset-0 z-50 bg-[url('/noise.png')] opacity-[0.03]" />
              {children}
            </div>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
