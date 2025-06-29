import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { Session } from 'next-auth';

type Role = 'admin' | 'manager' | 'murasel';


export function withRoleCheck(
  handler: (req: NextRequest, session?: Session) => Promise<Response>,
  allowedRoles: Role[]
) {
  return async (req: NextRequest) => {
    try {
      const session = await auth();

      if (!session?.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }

      const userRole = session.user.role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      return handler(req, session);

    } catch (error) {
      console.error('[API Auth] Error:', error);
      return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
  };
}
