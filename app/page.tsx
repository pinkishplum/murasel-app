'use client';

import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // This hook handles redirecting users who have a role to their dashboard.
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const { role } = session.user;
      if (role === 'manager' || role === 'murasel') {
        router.replace(`/${role}`);
      }
    }
  }, [status, session, router]);

  const handleSelectRole = async (role: 'manager' | 'murasel') => {
    const toastId = toast.loading('جاري الحفظ...');
    try {
      const res = await fetch('/api/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'فشل تعيين الدور');
      }

      await update({ role });
      toast.success('تم التعيين بنجاح! جاري توجيهك...', { id: toastId });
      window.location.reload();
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error((err as Error).message);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        جاري التحميل...
      </div>
    );
  }

  if (status === 'authenticated' && session?.user?.role) {
    // Admins see their dashboard links
    if (session.user.role === 'admin') {
      return (
        <div className="flex flex-col items-center justify-center h-screen space-y-8 p-6 bg-gray-50">
          <h1 className="text-3xl font-bold text-center text-gray-800">
            Welcome, Admin <br/>{session.user.name}!
          </h1>
          <p className="text-gray-600">You have access to all sections of the application.</p>
          <div className="flex flex-col space-y-6 w-full max-w-xs">
            <a href="/admin" className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white text-xl font-bold rounded-2xl shadow-md transition text-center">
              Admin Dashboard
            </a>
            <a href="/manager" className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-2xl shadow-md transition text-center">
              Manager Dashboard
            </a>
            <a href="/murasel" className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-2xl shadow-md transition text-center">
              Murasel Dashboard
            </a>
          </div>
        </div>
      );
    }
    // Other roles see a redirecting message
    return (
      <div className="flex items-center justify-center min-h-screen">
        جاري توجيهك...
      </div>
    );
  }

  if (status === 'authenticated' && !session?.user?.role) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-8 p-6 bg-gray-50">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Welcome, {session.user.name}!
        </h1>
        <p className="text-gray-600">يجب عليك اختيار نوع الحساب للمتابعة.</p>
        <div className="flex flex-col space-y-6 w-full max-w-xs">
          <button
            onClick={() => handleSelectRole('manager')}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-2xl shadow-md transition"
          >
            مدير مشروع
          </button>
          <button
            onClick={() => handleSelectRole('murasel')}
            className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-2xl shadow-md transition"
          >
            مراسل
          </button>
        </div>
      </div>
    );
  }

  // Fallback for unauthenticated users (who will be redirected by page HOCs)
  return null;
}