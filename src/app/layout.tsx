import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewIQ",
  description: "Adaptive AI for smarter travel reviews."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
