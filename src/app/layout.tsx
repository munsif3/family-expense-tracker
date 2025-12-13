import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


import { AuthProvider } from "@/features/auth/AuthContext";
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: "Family Finance Manager",
  description: "Secure, private finance management for couples.",
};

// Main Entry Point: RootLayout
// This layout wraps the entire application.
// It initializes global providers:
// 1. Fonts (Geist)
// 2. AuthProvider (Firebase Authentication State)
// 3. Toaster (Notification System)
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
