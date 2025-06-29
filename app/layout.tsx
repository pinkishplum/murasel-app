'use client';

import "./globals.css";
import NavBar from "@/app/components/NavBar";
import UserInfoBar from "@/app/components/UserInfoBar";
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex justify-center bg-gray-100">
      <SessionProvider>
        <div className="w-full min-h-screen bg-white relative">
          <NavBar />
            <UserInfoBar />
          {children}
            <Toaster position="top-center" reverseOrder={false} />

        </div>
      </SessionProvider>
      </body>
    </html>
  );
}
