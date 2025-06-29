import { connectMongo } from '@/lib/mongodb';
import { Users } from '@/models/Users';
import { NextRequest, NextResponse } from 'next/server';
import { withRoleCheck } from '@/lib/api-auth';
import { Session } from 'next-auth';

async function updateUserRoleHandler(req: NextRequest, { params }: { params: { id: string } }, session?: Session) {
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectMongo();
    const { id } = params;
    const { role } = await req.json();


    if (!['admin', 'manager', 'murasel'].includes(role)) {
      return NextResponse.json({ message: 'Invalid role specified' }, { status: 400 });
    }

    const updatedUser = await Users.findByIdAndUpdate(id, { role }, { new: true });
    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user role:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Only admin can access this endpoint
export const PUT = withRoleCheck(
  (req: NextRequest, session?: Session) => {
    if (!session) throw new Error('Session is required');
    return updateUserRoleHandler(req, { params: { id: req.nextUrl.pathname.split('/').pop() || '' } }, session);
  },
  ['admin']
);
