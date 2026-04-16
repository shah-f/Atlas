import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Adaptive AI for smarter Expedia travel reviews.",
  icons: {
    icon: "/atlas-tab-icon.svg",
    shortcut: "/atlas-tab-icon.svg",
    apple: "/atlas-tab-icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Nothing+You+Could+Do&family=Patrick+Hand&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;0,900;1,600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
