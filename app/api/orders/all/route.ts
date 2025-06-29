import { connectMongo } from '@/lib/mongodb';
import { Order } from '@/models/Orders';
import { NextRequest } from 'next/server';
import { withRoleCheck } from '@/lib/api-auth';
import { Session } from 'next-auth';
import { ORDER_STATUS } from '@/models/OrderTypes';

async function getOrdersHandler(request: NextRequest, session?: Session) {
  if (!session?.user?.email || !session.user.role) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectMongo();

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '4'); // Increased limit slightly
    const tab = searchParams.get('tab'); // Get the tab for filtering
    const skip = (page - 1) * limit;

    const userRole = session.user.role;
    const userEmail = session.user.email;

    // Base query
    let query = {};

    // Build query based on user role
    if (userRole === 'manager') {
      // Managers only see their own orders that are not soft-deleted
      query = { 
        userEmail: userEmail,
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
      };

      console.log('Manager query filter:', JSON.stringify(query));
    } else if (userRole === 'murasel') {
      // Murasel should never see soft-deleted orders
      const notDeletedFilter = { 
        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
      };

      // For murasel, filter based on the active tab
      switch (tab) {
        case 'new':
          // Only show NEW or LATE orders in the new tab
          query = { 
            status: { $in: [ORDER_STATUS.NEW, ORDER_STATUS.LATE] },
            deliveryPerson: { $exists: false }, // Ensure no delivery person is assigned
            ...notDeletedFilter
          };
          break;
        case 'inProgress':
          // Only show IN_PROGRESS orders assigned to this murasel in the inProgress tab
          console.log('IN_PROGRESS status value:', ORDER_STATUS.IN_PROGRESS);
          console.log('User email for deliveryPerson:', userEmail);
          query = { 
            status: ORDER_STATUS.IN_PROGRESS, 
            deliveryPerson: userEmail,
            ...notDeletedFilter
          };
          break;
        case 'done':
          // Only show completed orders assigned to this murasel in the done tab
          query = { 
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.DELIVERED_LATE] },
            deliveryPerson: userEmail,
            ...notDeletedFilter
          };
          break;
        default:
          // If no tab is specified, murasel sees no orders by default
      }
    } else if (userRole === 'admin') {
      switch (tab) {
        case 'new':
          // Only show NEW or LATE orders in the new tab
          query = { 
            status: { $in: [ORDER_STATUS.NEW, ORDER_STATUS.LATE] },
            deliveryPerson: { $exists: false } // Ensure no delivery person is assigned
          };
          break;
        case 'inProgress':
          // Only show IN_PROGRESS orders in the inProgress tab
          query = { 
            status: ORDER_STATUS.IN_PROGRESS
          };
          break;
        case 'done':
          // Only show completed orders in the done tab
          query = { 
            status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.DELIVERED_LATE, ORDER_STATUS.NOT_RECEIVED] }
          };
          break;
      }

    }

    // Debug logging
    console.log('Query for orders:', JSON.stringify(query));

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`Found ${orders.length} orders for tab ${tab}`);

    // Check if any returned orders have isDeleted=true
    const deletedOrders = orders.filter(order => order.isDeleted === true);
    if (deletedOrders.length > 0) {
      console.warn('WARNING: Found soft-deleted orders in query results:', deletedOrders);
    } else {
      console.log('No soft-deleted orders found in query results');
    }
    if (tab === 'inProgress') {
      console.log('In-progress orders:', JSON.stringify(orders));
    }

    const total = await Order.countDocuments(query);
    const hasMore = (skip + orders.length) < total;

    return Response.json({ orders, hasMore }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return Response.json({ message: 'Failed to fetch orders' }, { status: 500 });
  }
}

export const GET = withRoleCheck(getOrdersHandler, ['admin', 'manager', 'murasel']);
