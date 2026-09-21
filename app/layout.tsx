import "./globals.css";
import Nav from "@/components/Nav";
import type { Metadata } from "next";

const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || "PVR Cinemas";
const CHAIN_THEME_COLOR =
  process.env.NEXT_PUBLIC_CHAIN_THEME_COLOR || "#e50914";

export const metadata: Metadata = {
  title: CHAIN_NAME,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --brand: ${CHAIN_THEME_COLOR}; }`,
          }}
        />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
