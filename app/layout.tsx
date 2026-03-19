import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ThemeToggle from "@/components/theme-toggle";
import WelcomeTyping from "@/components/welcome-typing";

export const metadata: Metadata = {
  title: "Hexora",
  description: "Hexora - curated lyrics and artist discovery powered by Next.js and Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <body className="antialiased">
        {gaId ? <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" /> : null}
        {gaId ? (
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        ) : null}
        <WelcomeTyping />
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="mx-auto mt-6 w-full max-w-6xl px-4 pb-6 md:px-8">
            <div className="card w-full overflow-hidden rounded-2xl px-4 py-4 text-center">
              <p className="eyebrow">Copyright 2026 Hexora</p>
              <p className="mt-1 break-words text-xs leading-relaxed text-[var(--muted)]">
                Policy: Content is protected. Copying, republishing, or redistribution without permission is not allowed.
              </p>
            </div>
          </footer>
        </div>
        <ThemeToggle />
      </body>
    </html>
  );
}
