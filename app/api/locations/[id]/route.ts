import { connectMongo } from '@/lib/mongodb';
import { Locations } from '@/models/Locations';
import { NextRequest, NextResponse } from 'next/server';
import { withRoleCheck } from '@/lib/api-auth';
import { Session } from 'next-auth';

type RouteContext = { params: { id: string } };

// PUT a location
async function updateLocationHandler(
  req: NextRequest, 
  { params }: RouteContext, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  session?: Session
) {
    try {
        const { id } = params;
        const body = await req.json();
        const { name, mapLink } = body;

        if (!name || !mapLink) {
            return NextResponse.json({ message: 'Name and Map Link are required' }, { status: 400 });
        }

        await connectMongo();
        const updatedLocation = await Locations.findByIdAndUpdate(id, { name, mapLink }, { new: true });

        if (!updatedLocation) {
            return NextResponse.json({ message: 'Location not found' }, { status: 404 });
        }

        return NextResponse.json(updatedLocation);
    } catch (error) {
        console.error('Failed to update location:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a location
async function deleteLocationHandler(
  req: NextRequest, 
  { params }: RouteContext, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  session?: Session
) {
    try {
        await connectMongo();
        const { id } = params;
        const deletedLocation = await Locations.findByIdAndDelete(id);

        if (!deletedLocation) {
            return NextResponse.json({ message: 'Location not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Location deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete location:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export const PUT = withRoleCheck(
  (req: NextRequest, session?: Session) => {
    if (!session) throw new Error('Session is required');
    const id = req.nextUrl.pathname.split('/').pop() || '';
    return updateLocationHandler(req, { params: { id } }, session);
  },
  ['admin']
);

export const DELETE = withRoleCheck(
  (req: NextRequest, session?: Session) => {
    if (!session) throw new Error('Session is required');
    const id = req.nextUrl.pathname.split('/').pop() || '';
    return deleteLocationHandler(req, { params: { id } }, session);
  },
  ['admin']
);
