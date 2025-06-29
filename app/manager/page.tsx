'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PageHeader from '@/app/components/PageHeader';
import CustomButton from '@/app/components/CustomButton';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Timer from '@/app/components/Timer';
import { Order, OrderItem, ORDER_STATUS } from '@/models/OrderTypes'; // Assuming OrderTypes.ts is in @/app/models/
import auth from '@/app/components/auth';
import toast from "react-hot-toast";


function ManagerPage() {
  const { data: session } = useSession();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ordersPerPage = 4;



  const isLoadingRef = useRef(false);



  const fetchOrders = useCallback(async () => {
    // if a fetch is already in progress or no more data, return
    if (isLoadingRef.current || !hasMore) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);

      const url = `/api/orders/all?page=${page}&limit=${ordersPerPage}`;
      console.log('Fetching orders with URL:', url);

      const res = await fetch(url);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!res.ok) {
        console.error('API Error:', res.status, res.statusText);
        throw new Error(`API Error: ${res.statusText}`);
      }

      // Destructure the response to get the 'orders' array and 'hasMore' flag
      const responsePayload = await res.json();
      const newOrdersData: Order[] = responsePayload.orders;
      const apiHasMore: boolean = responsePayload.hasMore;

      // Debug log to check if any orders have isDeleted=true
      console.log('Fetched orders:', newOrdersData);
      const deletedOrders = newOrdersData.filter(order => order.isDeleted === true);
      if (deletedOrders.length > 0) {
        console.warn('Warning: Found soft-deleted orders in API response:', deletedOrders);
      }

      setHasMore(apiHasMore); // Trust the API's determination for hasMore

      if (newOrdersData && newOrdersData.length > 0) {
        setOrders((prevOrders) => {
          const existingIds = new Set(prevOrders.map((o) => o._id));
          const uniqueOrders = newOrdersData.filter((o: Order) => !existingIds.has(o._id));
          return [...prevOrders, ...uniqueOrders];
        });
        setPage((prevPage) => prevPage + 1);
      }

    } catch (err) {
      console.error('Error loading orders:', err);

    } finally {
      isLoadingRef.current = false;
      setLoading(false); // Reset loading state
    }
  }, [page, hasMore, ordersPerPage]);



  // Effect for loading initial orders
  useEffect(() => {
    if (session?.user?.email) {
      // Fetch initial orders if:
      // 1. Orders array is empty
      // 2. We believe there's more data (`hasMore`)
      // 3. We are on page 1 (to prevent re-fetching initial if page changed due to other reasons)
      // 4. No fetch is currently in progress (`!isLoadingRef.current`)
      if (orders.length === 0 && hasMore && page === 1 && !isLoadingRef.current) {
        fetchOrders();
      }
    }
  }, [session?.user?.email, orders.length, hasMore, page, fetchOrders]);

  // Effect for handling infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      // Early return if already loading, no more data.
      // isLoadingRef.current check ensures we don't initiate if already fetching.
      // 'loading' state check is also a good guard for UI consistency.
      if (isLoadingRef.current || !hasMore || loading) {
        return;
      }

      // Check if user has scrolled to near the bottom of the page
      if (
        window.innerHeight + document.documentElement.scrollTop + 100 >= // 100px offset
        document.documentElement.offsetHeight
      ) {
        fetchOrders();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, fetchOrders]); // fetchOrders is a dependency


// Inside the ManagerPage component

const handleDelete = async (id: string) => {
  if (!confirm('هل أنت متأكد أنك تريد حذف هذا الطلب؟')) return;

  // --- OPTIMISTIC UI UPDATE ---
  // Immediately remove the order from the local state.
  setOrders((prevOrders) => prevOrders.filter((order) => order._id !== id));

  try {
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      // If the API call fails, show an error and roll back the change.
      toast.error('فشل حذف الطلب');
      // To roll back, you would need to re-fetch the orders.
      // For simplicity, you can prompt the user to refresh or trigger fetchOrders() again.
      // fetchOrders(); // You could call this to resync.
    } else {
      toast.success('تم حذف الطلب بنجاح');
    }
  } catch (error) {
    console.error(error);
    toast.error('فشل حذف الطلب');
    // Also consider rolling back here.
  }
};

  const getOrderStatus = (order: Order) => {
    const now = new Date();
    const delivery = new Date(order.deliveryTime);

    if (
      order.status === ORDER_STATUS.DELIVERED ||
      order.status === ORDER_STATUS.DELIVERED_LATE ||
      order.status === ORDER_STATUS.NOT_RECEIVED
    ) return order.status;

    if (order.status === ORDER_STATUS.IN_PROGRESS)
      return ORDER_STATUS.IN_PROGRESS;
    if (now > delivery)
      return ORDER_STATUS.LATE; // Added check for IN_PROGRESS

    return ORDER_STATUS.NEW;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('ar-EG')} - ${date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`;
  };

  return (
    <div className="p-4 space-y-6">
      <PageHeader title="الطلبات" />

      <div className="flex justify-center py-4">
        <Link href="/manager/orders/new">
          <CustomButton
            text="+ طلب"
            size="large"
            color="blue"
            width="w-40"
            height="h-16"
          />
        </Link>
      </div>

      {/* Main Content */}
      {orders.length === 0 && loading && page === 1 ? ( // Initial loading message for the very first load
        <div className="text-center text-gray-500">...تحميل الطلبات</div>
      ) : orders.length === 0 && !hasMore && !loading ? ( // No orders at all after attempting to load
        <div className="text-center text-gray-500">لا توجد طلبات حتى الآن.</div>
      ) : (
        <div className="flex flex-col space-y-6">
          {orders.map((order: Order) => (
            <div
              key={order._id}
              className="p-6 border rounded-2xl shadow-md bg-white space-y-4"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-lg">مقدم الطلب: {order.customerName}</div>
                <div
                  className={`px-4 py-1 rounded-full font-bold text-xs ${
                    getOrderStatus(order) === ORDER_STATUS.LATE ||
                    getOrderStatus(order) === ORDER_STATUS.NOT_RECEIVED
                      ? 'text-red-600 border border-red-400'
                      : getOrderStatus(order) === ORDER_STATUS.DELIVERED ||
                        getOrderStatus(order) === ORDER_STATUS.DELIVERED_LATE
                      ? 'text-green-600 border border-green-400'
                      : getOrderStatus(order) === ORDER_STATUS.IN_PROGRESS
                      ? 'text-yellow-600 border border-yellow-400'
                      : 'text-blue-600 border border-blue-400'
                  }`}
                >
                  {getOrderStatus(order)}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="text-sm text-gray-700 space-y-1">
                <div>الجهة المستلمة: {order.location}</div>
                <div>
                  رابط الموقع:{' '}
                  <a
                    href={order.mapLink.startsWith('http') ? order.mapLink : `https://${order.mapLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    فتح الخريطة
                  </a>
                </div>
                <div>اسم ممثل الجهة: {order.receiverName}</div>
                <div>رقم التواصل لممثل الجهة: {order.receiverPhone}</div>
                <div>موعد التسليم: {formatDateTime(order.deliveryTime)}</div>
                {order.note && (
                  <div>
                    <span className="font-semibold">ملاحظات:</span> {order.note}
                  </div>
                )}
                {order.muraselNote && (
                  <div>
                    <span className="font-semibold">ملاحظات المراسل:</span> {order.muraselNote}
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="text-right font-bold text-md mb-2">البنود</div>
              <div className="flex flex-col space-y-2">
                {order.items.map((item: OrderItem, idx) => (
                  <div
                    key={idx} // Prefer item.id if OrderItem has a stable unique ID
                    className="flex justify-between items-center bg-gray-100 p-3 rounded-xl text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="font-bold">{item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Timer */}
              {order.startedAt && (
                <div className="pt-4 border-t">
                  <div className="flex flex-row items-center"> {/* Removed space-y-2 for flex-row */}
                    <span className="text-sm font-semibold ml-2">الوقت المستغرق:</span> {/* Use ml-2 or mr-2 for spacing in RTL/LTR */}
                    <Timer startedAt={order.startedAt} endedAt={order.endedAt} />
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-center gap-4">
                  {(order.status !== ORDER_STATUS.DELIVERED &&
                    order.status !== ORDER_STATUS.DELIVERED_LATE &&
                    order.status !== ORDER_STATUS.NOT_RECEIVED &&
                    order.status !== ORDER_STATUS.IN_PROGRESS ) && (
                    <Link href={`/manager/orders/edit/${order._id}`}>
                      <button className="px-6 py-2 rounded-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold text-sm">
                        تعديل
                      </button>
                    </Link>
                  )}
                  {(order.status === ORDER_STATUS.DELIVERED ||
                    order.status === ORDER_STATUS.DELIVERED_LATE ||
                    order.status === ORDER_STATUS.NOT_RECEIVED) && (
                    <Link
                      href={{
                        pathname: `/manager/orders/new`,
                        query: { data: encodeURIComponent(JSON.stringify(order)) }
                      }}
                    >
                      <button className="px-6 py-2 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold text-sm">
                        استنساخ
                      </button>
                    </Link>
                  )}
                  {order.status !== ORDER_STATUS.IN_PROGRESS && (
                    <button
                      onClick={() => handleDelete(order._id)}
                      className="px-6 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-sm"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loader for subsequent fetches (when orders already exist) */}
          {loading && orders.length > 0 && (
            <div className="text-center py-4">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            </div>
          )}

          {/* No more data message (when orders exist but no more to load) */}
          {!hasMore && orders.length > 0 && !loading && (
            <div className="text-center text-gray-400 text-sm py-4">تم تحميل جميع الطلبات</div>
          )}
        </div>
      )}
    </div>
  );
}

export default auth(ManagerPage, ['manager', 'admin']);
