import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Learnly — Learn anything, your way", description: "A learning space shaped around your goals." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
