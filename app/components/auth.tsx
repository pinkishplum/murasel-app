'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type Role = 'admin' | 'manager' | 'murasel';

export default function auth(
  WrappedComponent: React.ComponentType,
  allowedRoles: Role[]
) {
  const AuthComponent = (props: React.ComponentProps<typeof WrappedComponent>) => {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      // Wait until the session is loaded
      if (status === 'loading') {
        return;
      }

      // If there's no session, redirect to login
      if (!session) {
        router.replace('/login');
        return;
      }

      // If the user's role is not in the list of allowed roles, redirect
      const userRole = session.user.role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        // Redirect them to their own dashboard, or the root if they have no role
        router.replace(userRole ? `/${userRole}` : '/');
      }
    }, [session, status, router]);

    // While loading, or if the user is not yet authorized, show a loading screen.
    if (status === 'loading' || !session || !session.user.role || !allowedRoles.includes(session.user.role)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          جاري التحميل...
        </div>
      );
    }

    // If authorized, render the actual page component
    return <WrappedComponent {...props} />;
  };

  return AuthComponent;
}
