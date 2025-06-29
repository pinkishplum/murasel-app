'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: '/login' });
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback to manual redirect if signOut fails
      window.location.href = '/login';
    }
  };

  return (
    <>
      <div className="relative flex items-center justify-center py-5 px-2 bg-white shadow-md">

        <div className="absolute left-1/2 transform -translate-x-1/2  ml-7 mt-2">
          <Image src="/logo.svg" alt="Logo" width={180} height={100} />
        </div>

        <div className="ml-auto cursor-pointer" onClick={() => setIsOpen(true)}>
          <Image src="/menu.png" alt="Menu" width={37} height={19} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-0 right-0 w-[300px] h-full bg-white z-50 flex flex-col shadow-lg">

          <div className="flex justify-start p-4">
            <button onClick={() => setIsOpen(false)}>
              <span className="text-5xl">&times;</span> {/* Big X */}
            </button>
          </div>

          <div className="flex flex-col justify-between flex-1 p-6">

            <div className="flex justify-end">
              <button
                onClick={handleSignOut}
                className="px-20 py-2 bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 transition-colors rounded-full text-black font-bold"
              >
                تسجيل الخروج
              </button>
            </div>

            <div className="flex flex-col space-y-3 text-right text-black text-2xl font-medium mt-10">
              <button>الرئيسية</button>
              <button>المراسلين</button>
              <button>طلباتي</button>
            </div>

            <div className="flex-grow"></div>

          </div>
        </div>
      )}
    </>
  );
}
