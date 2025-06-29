import { connectMongo } from '@/lib/mongodb';
import { Order } from '@/models/Orders';
import { NextRequest } from 'next/server';
import { withRoleCheck } from '@/lib/api-auth';
import { Session } from 'next-auth';

// POST (create new order)
async function createOrderHandler(req: NextRequest, session?: Session) {
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectMongo();


    const body = await req.json();
    const {
      customerName,
      location,
      mapLink,
      deliveryTime,
      receiverName,
      receiverPhone,
      note,
      items,
    } = body;

    // debugging
    console.log('Incoming order body:', body);

    // Create and save order
    const newOrder = new Order({
      customerName,
      location,
      mapLink,
      deliveryTime,
      receiverName,
      receiverPhone,
      note,
      items,
      userEmail: session.user.email,
      isDeleted: false,
    });

    await newOrder.save();

    return Response.json({ message: ' Order created successfully' }, { status: 201 });
  } catch (error) {
    console.error(' Order creation failed:', error);
    return Response.json({ message: ' Failed to create orders' }, { status: 500 });
  }
}

// Fetch existing Orders
async function getOrdersHandler(req: NextRequest, session?: Session) {
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectMongo();

    const orders = await Order.find({
      userEmail: session.user.email,
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
    }).sort({createdAt: -1});

    return Response.json(orders, {status: 200});
  } catch (error) {
    console.error(' Failed to fetch orders:', error);
    return Response.json({message: ' Failed to fetch orders'}, {status: 500});
  }
}

// Both manager and murasel roles can create and view their own orders
export const POST = withRoleCheck(createOrderHandler, ['admin','manager', 'murasel']);
export const GET = withRoleCheck(getOrdersHandler, ['manager', 'murasel']);
