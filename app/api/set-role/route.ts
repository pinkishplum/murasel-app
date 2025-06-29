// app/api/set-role/route.ts

import { auth } from '@/lib/auth';
import { connectMongo } from '@/lib/mongodb';
import { Users } from '@/models/Users';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // 1. Ensure the user is authenticated
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    // 2. Get the role from the request body
    const { role } = await req.json();
    if (!['manager', 'murasel'].includes(role)) {
      return NextResponse.json({ message: 'Invalid role specified' }, { status: 400 });
    }

    await connectMongo();
    console.log("connected in setrole");

    // Check if user already has a role
    const existingUser = await Users.findOne({ email: session.user.email });
    if (existingUser && existingUser.role) {
      return NextResponse.json({ 
        message: 'You already have a role assigned. Contact an admin to change your role.', 
        user: existingUser 
      }, { status: 403 });
    }

    // 3. Find the user by email and update them, or create them if they don't exist.
    const updatedUser = await Users.findOneAndUpdate(
      { email: session.user.email }, // The condition to find the user
      {
        // The fields to set on update or insert
        $set: {
          role: role,
          name: session.user.name,
          image: session.user.image,
        },
        $setOnInsert: {
            email: session.user.email,
        }
      },
      {
        new: true,    // Return the updated document
        upsert: true  // Create the document if it doesn't exist
      }
    );

    console.log(updatedUser);

    return NextResponse.json({ message: 'User role updated successfully', user: updatedUser }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/set-role:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
