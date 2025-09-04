import type { Metadata } from "next";
import "./globals.css"; // optional if you have global styles

export const metadata: Metadata = {
  title: "Law as Code Chatbot",
  description: "An AI assistant for statutes and legal analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
