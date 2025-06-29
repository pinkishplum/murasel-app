'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Timer from '@/app/components/Timer';
import {Order, OrderItem, ORDER_STATUS, OrderStatus} from '@/models/OrderTypes';
import auth from '@/app/components/auth';
import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_NEW = ORDER_STATUS.NEW;
const STATUS_IN_PROGRESS = ORDER_STATUS.IN_PROGRESS;
const STATUS_DELIVERED = ORDER_STATUS.DELIVERED;
const STATUS_DELIVERED_LATE = ORDER_STATUS.DELIVERED_LATE;
const STATUS_NOT_RECEIVED = ORDER_STATUS.NOT_RECEIVED;
const STATUS_LATE = ORDER_STATUS.LATE;
const STATUS_LATE_DISPLAY = 'متأخر';

const TABS = [
  { label: 'الطلبات الجديدة', value: 'new' },
  { label: 'قيد التنفيذ', value: 'inProgress' },
  { label: 'المكتملة', value: 'done' }
];

type TabValue = 'new' | 'inProgress' | 'done';

function MuraselPage() {
    const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State for tabs, data, and pagination
  const [activeTab, setActiveTab] = useState<TabValue>('new');
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);

  // State for the note-taking modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [actionType, setActionType] = useState<'delivered' | 'not_received'>('delivered');

  // This effect reads the tab from the URL to set the initial state
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabValue;
    if (tabFromUrl && TABS.some(t => t.value === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Unified data fetching function
// This is the function DEFINITION that needs to be updated

// The original signature was: async (currentPage: number, currentTab: TabValue)

const fetchOrders = useCallback(async (currentPage: number, currentTab: TabValue, signal: AbortSignal) => {
  if (isLoadingRef.current) return;

  isLoadingRef.current = true;
  setLoading(true);

  try {
    // Pass the signal down to the native fetch API
    const res = await fetch(`/api/orders/all?page=${currentPage}&limit=4&tab=${currentTab}`, { signal });
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);

    const data = await res.json();
    const newOrders: Order[] = data.orders || [];

    setHasMore(data.hasMore);

    if (currentPage === 1) {
      setOrders(newOrders);
    } else {
      setOrders(prev => {
        const existingIds = new Set(prev.map(o => o._id));
        const uniqueNewOrders = newOrders.filter((o: Order) => !existingIds.has(o._id));
        return [...prev, ...uniqueNewOrders];
      });
    }

  } catch (err: unknown) {
    // This check prevents an error from being shown when you intentionally cancel a request
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('Fetch aborted');
      return;
    }
    console.error('Error loading orders:', err);
    toast.error('فشل تحميل الطلبات');
  } finally {
    isLoadingRef.current = false;
    setLoading(false);
  }
}, []); // The dependency array can remain empty



// Replace your old useEffect with this one
useEffect(() => {

 if (!session) {
    return; // Do nothing if loading (session is undefined) or unauthenticated (session is null)
  }


  // Create a controller for this specific render
  const controller = new AbortController();

  // Call fetchOrders with the controller's signal
  fetchOrders(page, activeTab, controller.signal);

  // This is the cleanup function. It runs when the effect is re-run (i.e., when a tab changes)
  // or when the component unmounts.
  return () => {
    // Abort the fetch request from the previous render
    controller.abort();
  };
}, [page, activeTab, fetchOrders, session]); // Added session as a dependency

  // Effect for infinite scroll - This now only increments the page state
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      if (window.innerHeight + document.documentElement.scrollTop + 150 >= document.documentElement.offsetHeight) {
        setPage(prev => prev + 1);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  const handleTabClick = (tab: TabValue) => {
    if (tab === activeTab) return;

    setOrders([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    setActiveTab(tab);
    router.push(`/murasel?tab=${tab}`);
  };

  // Triggers a refetch to ensure UI is in sync after an action
  const refreshCurrentTabData = () => {
    setOrders([]);
    setPage(1); // This will trigger the fetching useEffect
    setHasMore(true);
  };

  // --- All your other handler functions (handleStartDelivery, etc.) remain the same ---
  const handleStartDelivery = async (id: string) => {
    const toastId = toast.loading('جاري قبول الطلب...');
    const startedAtTime = new Date().toISOString();
    const deliveryPersonEmail = session?.user?.email;

    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: STATUS_IN_PROGRESS,
          startedAt: startedAtTime,
          deliveryPerson: deliveryPersonEmail,
        }),
      });
      toast.success('تم قبول الطلب بنجاح', { id: toastId });

      // Switch to the inProgress tab after accepting the order
      handleTabClick('inProgress');
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      err
    ) {
      toast.error('فشل قبول الطلب', { id: toastId });
      refreshCurrentTabData();
    }
  };
  const handleSubmitStatus = async () => {
    if (!currentOrderId) return;
    const toastId = toast.loading('جاري تحديث الحالة...');
    const orderToUpdate = orders.find((o) => o._id === currentOrderId);
    if (!orderToUpdate) {
      toast.error('لم يتم العثور على الطلب', { id: toastId });
      setShowNoteModal(false);
      return;
    }

    const endedAtTime = new Date().toISOString();
    const isLate = new Date() > new Date(orderToUpdate.deliveryTime);

    const finalStatusValue: OrderStatus = actionType === 'delivered'
      ? (isLate ? STATUS_DELIVERED_LATE : STATUS_DELIVERED)
      : STATUS_NOT_RECEIVED;

    try {
      await fetch(`/api/orders/${currentOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: finalStatusValue, endedAt: endedAtTime, muraselNote: noteText }),
      });
      toast.success('تم التحديث بنجاح', { id: toastId });

      // Switch to the done tab after completing an order
      setShowNoteModal(false);
      handleTabClick('done');
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      err
    ) {
      toast.error('فشل تحديث الحالة', { id: toastId });
      setShowNoteModal(false);
      refreshCurrentTabData();
    }
  };
  const openNoteModal = (id: string, type: 'delivered' | 'not_received') => {
    setCurrentOrderId(id);
    setActionType(type);
    setNoteText(orders.find(o => o._id === id)?.muraselNote || '');
    setShowNoteModal(true);
  };
  const handleMarkDelivered = (id: string) => openNoteModal(id, 'delivered');
  const handleMarkNotReceived = (id: string) => openNoteModal(id, 'not_received');
  const getOrderDisplayStatusTag = (order: Order): string => {
      const now = new Date();
      const deliveryTimeDate = order.deliveryTime ? new Date(order.deliveryTime) : null;
      const isPastDue = deliveryTimeDate ? now > deliveryTimeDate : false;
      const actualStatus = order.status || STATUS_NEW;

      if (actualStatus === STATUS_DELIVERED_LATE || actualStatus === STATUS_DELIVERED || actualStatus === STATUS_NOT_RECEIVED) return actualStatus;
      if (actualStatus === STATUS_IN_PROGRESS) return STATUS_IN_PROGRESS; // Always show IN_PROGRESS for orders in progress
      return isPastDue ? STATUS_LATE_DISPLAY : actualStatus;
  };
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "غير محدد";
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString('ar-EG')} - ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      e
    ) { 
      return "وقت غير صالح"; 
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-center space-x-2 sm:space-x-4 rtl:space-x-reverse bg-gray-100 p-2 rounded-full sticky top-2 z-10">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value as TabValue)}
            className={`px-4 py-2 sm:px-6 rounded-full border font-bold text-xs sm:text-sm transition ${
              activeTab === tab.value ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" dir="rtl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {actionType === 'delivered' ? 'تم التنفيذ' : 'لم يتم الاستلام'}
            </h3>
            <p className="mb-4 text-gray-600">يمكنك إضافة ملاحظات (اختياري)</p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full border rounded-xl p-3 mb-4 h-32 text-gray-700"
              placeholder="أضف ملاحظاتك هنا..."
            />
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setCurrentOrderId(null);
                  setNoteText('');
                }}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-full font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmitStatus}
                className={`px-6 py-2 text-white rounded-full font-bold ${
                  actionType === 'delivered' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 pt-4">
        {loading && orders.length === 0 ? (
          <div className="text-center py-10"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div></div>
        ) : orders.length === 0 && !hasMore ? (
          <div className="text-center text-gray-500 py-10">لا توجد طلبات في هذه الفئة.</div>
        ) : (
          <>
            {orders.map((order: Order) => {
                const displayTag = getOrderDisplayStatusTag(order);
                const actualStatus = order.status || STATUS_NEW;
                return (
                  <div key={order._id} className="p-5 border rounded-2xl shadow-md bg-white space-y-4" dir="rtl">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                      <div className="font-bold text-lg text-gray-800">طلب من: {order.customerName || 'غير محدد'}</div>
                      <div className={`text-xs font-bold px-3 py-1 border rounded-full ${
                        displayTag === STATUS_LATE_DISPLAY || displayTag === STATUS_NOT_RECEIVED ? 'bg-red-100 text-red-700 border-red-300' :
                        displayTag === STATUS_IN_PROGRESS ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        displayTag === STATUS_DELIVERED || displayTag === STATUS_DELIVERED_LATE ? 'bg-green-100 text-green-700 border-green-300' :
                        'bg-blue-100 text-blue-700 border-blue-300'
                      }`}>
                        {displayTag}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1 border-b pb-3 mb-3">
                      <div><span className="font-semibold">الجهة المستلمة:</span> {order.location || '-'}</div>
                      <div>
                        <span className="font-semibold">رابط الموقع:</span>
                        {order.mapLink ? (
                          <a href={order.mapLink.startsWith('http') ? order.mapLink : `https://${order.mapLink}`}
                             target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"> فتح الخريطة </a>
                        ) : ' -'}
                      </div>
                      <div><span className="font-semibold">اسم المستلم:</span> {order.receiverName || '-'}</div>
                      <div><span className="font-semibold">رقم المستلم:</span> {order.receiverPhone || '-'}</div>
                      <div><span className="font-semibold">موعد التسليم:</span> {formatDateTime(order.deliveryTime)}</div>
                      {order.deliveryPerson && <div><span className="font-semibold">مندوب التوصيل:</span> {order.deliveryPerson}</div>}
                      {order.note && <div><span className="font-semibold">ملاحظات الطلب:</span> {order.note}</div>}
                      {order.muraselNote && <div><span className="font-semibold">ملاحظات المراسل:</span> {order.muraselNote}</div>}
                    </div>
                    <div className="pt-2">
                      <div className="text-right font-bold text-md mb-2 text-gray-800">البنود المطلوبة</div>
                      <div className="flex flex-col space-y-2">
                        {order.items?.length > 0 ? (
                          order.items.map((item: OrderItem, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-100 p-3 rounded-xl text-sm">
                              <span className="text-gray-700">{item.name || 'بند غير مسمى'}</span>
                              <span className="font-bold text-gray-800">{item.quantity || '?'}</span>
                            </div>
                          ))
                        ) : <div className="text-sm text-gray-500">لا توجد بنود محددة.</div>}
                      </div>
                    </div>
                    {order.startedAt && (
                      <div className="pt-4 border-t">
                        <div className="flex flex-row items-center space-x-2 rtl:space-x-reverse">
                          <span className="text-sm font-semibold">الوقت المستغرق:</span>
                          <Timer startedAt={order.startedAt} endedAt={order.endedAt} />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-center gap-4 border-t pt-4 mt-4">
                      {(actualStatus === STATUS_NEW || actualStatus === STATUS_LATE) && (
                        <button onClick={() => handleStartDelivery(order._id)}
                                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold transition duration-150 ease-in-out">
                          اقبل الطلب
                        </button>
                      )}
                      {actualStatus === STATUS_IN_PROGRESS && (
                        <>
                          <button onClick={() => handleMarkDelivered(order._id)}
                                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold transition duration-150 ease-in-out">
                            تم التنفيذ
                          </button>
                          <button onClick={() => handleMarkNotReceived(order._id)}
                                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition duration-150 ease-in-out">
                            لم يتم الاستلام
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            {loading && orders.length > 0 && (
              <div className="text-center py-4">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              </div>
            )}
            {!hasMore && orders.length > 0 && !loading && (
              <div className="text-center text-gray-400 text-sm py-4">تم تحميل جميع الطلبات</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Export the component wrapped with the auth
export default auth(MuraselPage, ['murasel', 'admin']);
