import { connectMongo } from '@/lib/mongodb';
import { Locations } from '@/models/Locations';
import { NextRequest, NextResponse } from 'next/server';
import { withRoleCheck } from '@/lib/api-auth';
import { Session } from 'next-auth';

// GET all locations
async function getLocationsHandler(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  req: NextRequest, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  session?: Session
) {
  try {
    await connectMongo();
    const locations = await Locations.find({}).sort({ createdAt: 'desc' });
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a new location
async function createLocationHandler(
  req: NextRequest, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  session?: Session
) {
  try {
    const body = await req.json();
    const { name, mapLink } = body;

    if (!name || !mapLink) {
      return NextResponse.json({ message: 'Name and Map Link are required' }, { status: 400 });
    }

    await connectMongo();
    const newLocation = new Locations({ name, mapLink });
    await newLocation.save();

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error('Failed to create location:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withRoleCheck(getLocationsHandler, ['admin','manager']);
export const POST = withRoleCheck(createLocationHandler, ['admin']);
