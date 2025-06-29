import { connectMongo } from '@/lib/mongodb';
import { Users } from '@/models/Users';
import { NextRequest, NextResponse } from 'next/server';
import { withRoleCheck } from '@/lib/api-auth';
import { Session } from 'next-auth';

async function getUsersHandler(
  req: NextRequest, 
  session?: Session
) {
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectMongo();


    const users = await Users.find({}).select('-password'); // Exclude passwords
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Only admin can access this endpoint
export const GET = withRoleCheck(getUsersHandler, ['admin']);
