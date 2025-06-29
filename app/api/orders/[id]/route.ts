import { connectMongo } from '@/lib/mongodb';
import { Order } from '@/models/Orders';
import { NextRequest, NextResponse } from 'next/server';
import { ORDER_STATUS } from '@/models/OrderTypes';
import { withRoleCheck } from '@/lib/api-auth';
import { Session } from 'next-auth';

type RouteContext = { params: { id: string } };

interface UpdateOrderBody {
  status?: string;
  deliveryPerson?: string;
  startedAt?: string;
  endedAt?: string;
  customerName?: string;
  location?: string;
  mapLink?: string;
  deliveryTime?: string;
  receiverName?: string;
  receiverPhone?: string;
  note?: string;
  muraselNote?: string;
  items?: { name: string; quantity: number }[];
  userEmail?: string;
}

// GET Order by ID
async function getOrderHandler(req: NextRequest, session: Session, { params }: RouteContext) {
  try {
    await connectMongo();
    const { id } = params;
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ message: 'الطلب غير موجود' }, { status: 404 });
    }

    // Check if the order is soft-deleted and the user is not an admin
    if (order.isDeleted && session.user.role !== 'admin') {
      return NextResponse.json({ message: 'الطلب غير موجود' }, { status: 404 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return NextResponse.json({ message: 'فشل في تحميل الطلب' }, { status: 500 });
  }
}

// Update Order
async function updateOrderHandler(req: NextRequest, session: Session, { params }: RouteContext) {
  try {
    await connectMongo();
    const { id } = params;
    const body: UpdateOrderBody = await req.json();

    const orderToUpdate = await Order.findById(id);
    if (!orderToUpdate) {
        return NextResponse.json({ message: 'الطلب غير موجود' }, { status: 404 });
    }

    // Check if the order is soft-deleted and the user is not an admin
    if (orderToUpdate.isDeleted && session.user.role !== 'admin') {
        return NextResponse.json({ message: 'الطلب غير موجود' }, { status: 404 });
    }

    const isOwner = orderToUpdate.userEmail === session.user.email;
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    const isMurasel = session.user.role === 'murasel';
    const isAssignedToMurasel = orderToUpdate.deliveryPerson === session.user.email;

    const isAcceptingNewOrder = isMurasel &&
                               (orderToUpdate.status === ORDER_STATUS.NEW || orderToUpdate.status === ORDER_STATUS.LATE) && 
                               body.status === ORDER_STATUS.IN_PROGRESS;

    if (!isAdmin && !(isManager && isOwner) && !(isMurasel && (isAssignedToMurasel || isAcceptingNewOrder))) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (body.status === ORDER_STATUS.IN_PROGRESS && !orderToUpdate.startedAt) {
      body.startedAt = new Date().toISOString();
    }
    if (body.status === ORDER_STATUS.DELIVERED || body.status === ORDER_STATUS.DELIVERED_LATE || body.status === ORDER_STATUS.NOT_RECEIVED) {
      body.endedAt = new Date().toISOString();
    }

    console.log('Updating order with ID:', id);
    console.log('Update body:', JSON.stringify(body));
    console.log('Current order status:', orderToUpdate.status);
    console.log('Current deliveryPerson:', orderToUpdate.deliveryPerson);

    const updatedOrder = await Order.findByIdAndUpdate(id, body, { new: true });
    console.log('Updated order:', JSON.stringify(updatedOrder));

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error('Failed to update order:', error);
    const message = error instanceof Error ? error.message : 'فشل في تحديث الطلب';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// DELETE Order
async function deleteOrderHandler(req: NextRequest, session: Session, { params }: RouteContext) {
  try {
    await connectMongo();
    const { id } = params;
    const userRole = session.user.role;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: 'الطلب غير موجود' }, { status: 404 });
    }

    // Authorization Check
    const isOwner = order.userEmail === session.user.email;
    const isAdmin = userRole === 'admin';
    const isManager = userRole === 'manager';

    if (!isAdmin && !(isManager && isOwner)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (isAdmin) {
      // Hard delete for admins
      await Order.findByIdAndDelete(id);
    } else {
      // Soft delete for managers
      order.isDeleted = true;
      await order.save(); // This is a more direct way to save the change
    }

    return NextResponse.json({ message: 'تم حذف الطلب بنجاح' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete order:', error);
    return NextResponse.json({ message: 'فشل في حذف الطلب' }, { status: 500 });
  }
}

export const DELETE = withRoleCheck(
  (req: NextRequest, session?: Session) => {
    if (!session) throw new Error('Session is required');
    const id = req.nextUrl.pathname.split('/').pop() || '';
    return deleteOrderHandler(req, session, { params: { id } });
  },
  ['admin', 'manager']
);


// Export the handlers with role check
// All roles can view orders, but only admin and manager can update/delete
export const GET = withRoleCheck(
  (req: NextRequest, session?: Session) => {
    if (!session) throw new Error('Session is required');
    return getOrderHandler(req, session, { params: { id: req.nextUrl.pathname.split('/').pop() || '' } });
  },
  ['admin', 'manager', 'murasel']
);
export const PUT = withRoleCheck(
  (req: NextRequest, session?: Session) => {
    if (!session) throw new Error('Session is required');
    return updateOrderHandler(req, session, { params: { id: req.nextUrl.pathname.split('/').pop() || '' } });
  },
  ['admin', 'manager', 'murasel']
);

