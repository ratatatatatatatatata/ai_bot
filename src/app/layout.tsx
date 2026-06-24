import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Website Knowledge Chatbot",
  description:
    "Crawl a website and create a chatbot that answers only from that site's content.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
