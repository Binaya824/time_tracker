 
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Time Tracker",
  description: "Project & Time Tracking Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
