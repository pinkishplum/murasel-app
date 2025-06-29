'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Order, OrderItem, ORDER_STATUS } from '@/models/OrderTypes';
import auth from '@/app/components/auth';
import InputBox from '@/app/components/InputBox';
import CustomButton from '@/app/components/CustomButton';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'murasel' | 'manager' | null;
}

interface Location {
    _id: string;
    name: string;
    mapLink: string;
}

type TabValue = 'users' | 'orders' | 'locations';

const TABS = [
  { value: 'users', label: 'المستخدمين' },
  { value: 'orders', label: 'الطلبات' },
  { value: 'locations', label: 'المواقع' }
];

function AdminPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabValue>('users');

  //function to remove @gmail from email addresses
  const formatEmail = (email: string | undefined) => {
    if (!email) return '-';
    return email.replace(/@gmail.com/g, '');
  };

  //Log the session status and user role for debugging
  useEffect(() => {
    console.log(`DEBUG: Admin page - Session status is "${status}", user role is "${session?.user?.role}"`);
  }, [status, session]);

  //Users state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  //Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingOrdersRef = useRef(false);

  //Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationMapLink, setNewLocationMapLink] = useState('');


  //Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  //Fetch orders
  const fetchOrders = useCallback(async (isInitialLoad = false) => {
    if (isLoadingOrdersRef.current || (!isInitialLoad && !hasMore)) return;

    isLoadingOrdersRef.current = true;
    setLoadingOrders(true);

    const pageToFetch = isInitialLoad ? 1 : page;

    try {
      const res = await fetch(`/api/orders/all?page=${pageToFetch}&limit=8`);
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);

      const responsePayload = await res.json();
      const newOrdersData: Order[] = responsePayload.orders;

      setHasMore(responsePayload.hasMore);

      if (newOrdersData?.length > 0) {
        setOrders(prev => isInitialLoad ? newOrdersData : [...prev, ...newOrdersData]);
        setPage(pageToFetch + 1);
      } else if (isInitialLoad) {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      toast.error('فشل تحميل الطلبات');
    } finally {
      isLoadingOrdersRef.current = false;
      setLoadingOrders(false);
    }
  }, [page, hasMore]);

  //Fetch locations
  const fetchLocations = useCallback(async () => {
      setLoadingLocations(true);
      try {
          const res = await fetch('/api/locations');
          if (!res.ok) throw new Error('Failed to fetch locations');
          const data = await res.json();
          setLocations(data);
      } catch (error) {
          console.error('Error loading locations:', error);
          toast.error('فشل تحميل المواقع');
      } finally {
          setLoadingLocations(false);
      }
  }, []);

  //Handle role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    const originalUsers = [...users];
    setUsers(prevUsers => prevUsers.map(user =>
        user._id === userId ? { ...user, role: newRole as User['role'] } : user
    ));

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update role.');
      toast.success('User role updated successfully!');
    } catch (error) {
      setUsers(originalUsers); // Revert on error
      console.error('Error updating role:', error);
      toast.error('Failed to update user role.');
    }
  };

  //order delete
  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا الطلب؟')) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل حذف الطلب');
      setOrders((prev) => prev.filter((order: Order) => order._id !== id));
      toast.success('تم حذف الطلب بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('فشل حذف الطلب');
    }
  };

  //add new location
  const handleAddLocation = async () => {
      if (!newLocationName || !newLocationMapLink) {
          toast.error('يرجى تعبئة اسم الموقع والرابط');
          return;
      }
      const toastId = toast.loading('جاري إضافة الموقع...');
      try {
          const res = await fetch('/api/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newLocationName, mapLink: newLocationMapLink }),
          });
          if (!res.ok) throw new Error('Failed to add location');

          toast.success('تمت إضافة الموقع بنجاح', { id: toastId });
          setNewLocationName('');
          setNewLocationMapLink('');
          fetchLocations(); // Refresh the list
      } catch (error) {
          toast.error('فشل إضافة الموقع', { id: toastId });
          console.error('Error adding location:', error);
      }
  };

  //delete location
  const handleDeleteLocation = async (id: string) => {
      if (!window.confirm('هل أنت متأكد من حذف هذا الموقع؟')) return;
      const toastId = toast.loading('جاري الحذف...');
      try {
          const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete location');

          toast.success('تم حذف الموقع بنجاح', { id: toastId });
          setLocations(prev => prev.filter(loc => loc._id !== id)); // Optimistic UI update
      } catch (error) {
          toast.error('فشل حذف الموقع', { id: toastId });
          console.error('Error deleting location:', error);
      }
  };


  //date time
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "غير محدد";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "وقت غير صالح";
      return `${date.toLocaleDateString('ar-EG')} - ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch (e) { console.error(e); return "وقت غير صالح"; }
  };

  //fetch data on tab change
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
    if (activeTab === 'orders' && orders.length === 0) {
      fetchOrders(true);
    }
    if (activeTab === 'locations' && locations.length === 0) {
        fetchLocations();
    }
  }, [activeTab, fetchUsers, fetchOrders, fetchLocations, users.length, orders.length, locations.length]);

  //infinite scroll for orders
  useEffect(() => {
    if (activeTab !== 'orders') return;
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop + 200 >= document.documentElement.offsetHeight && !isLoadingOrdersRef.current && hasMore) {
        fetchOrders();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, hasMore, fetchOrders]);

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">لوحة تحكم المسؤول</h1>

      <div className="flex justify-center space-x-2 sm:space-x-4 rtl:space-x-reverse bg-gray-100 p-2 rounded-full sticky top-2 z-10">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as TabValue)}
            className={`px-4 py-2 sm:px-6 rounded-full border font-bold text-xs sm:text-sm transition ${
              activeTab === tab.value ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-center">إدارة المستخدمين</h2>
          {loadingUsers ? (
            <div className="text-center py-10"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div></div>
          ) : users.length === 0 ? (
            <div className="text-center text-gray-500 py-10">لا يوجد مستخدمين.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl shadow-md">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-right">البريد الإلكتروني</th>
                    <th className="py-3 px-4 text-right">الدور</th>
                    <th className="py-3 px-4 text-right">تغيير الدور</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-t">
                      <td className="py-3 px-4" title={user.email}>{formatEmail(user.email)}</td>
                      <td className="py-3 px-4" title={user.role || 'لم يختر دور'}>{user.role || 'لم يختر دور'}</td>
                      <td className="py-3 px-4">
                        <select
                          value={user.role || ''}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          className="border rounded-lg p-2 w-full max-w-[150px] appearance-none bg-white bg-no-repeat bg-right pr-8 text-gray-700 hover:border-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer text-sm"
                          style={{ backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\")", backgroundSize: "1.5em 1.5em" }}
                        >
                          <option value="admin">admin</option>
                          <option value="manager">manager</option>
                          <option value="murasel">murasel</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
         <div className="space-y-6">
           <h2 className="text-xl font-semibold text-center">إدارة الطلبات</h2>
           {(loadingOrders && orders.length === 0) ? (
             <div className="text-center py-10"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div></div>
           ) : orders.length === 0 && !hasMore ? (
             <div className="text-center text-gray-500 py-10">لا توجد طلبات.</div>
           ) : (
             <div className="flex flex-col space-y-6">
               {orders.map((order: Order) => (
                 <div key={order._id} className="p-6 border rounded-2xl shadow-md bg-white space-y-4" dir="rtl">
                   <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                     <div className="font-bold text-lg text-gray-800">طلب من: {order.customerName || 'غير محدد'}</div>
                     <div className={`text-xs font-bold px-3 py-1 border rounded-full ${
                       order.status === ORDER_STATUS.NOT_RECEIVED ? 'bg-red-100 text-red-700 border-red-300' :
                       order.status === ORDER_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                       order.status === ORDER_STATUS.DELIVERED || order.status === ORDER_STATUS.DELIVERED_LATE ? 'bg-green-100 text-green-700 border-green-300' :
                       'bg-blue-100 text-blue-700 border-blue-300'
                     }`}>
                       {order.status || ORDER_STATUS.NEW}
                     </div>
                   </div>
                   <div className="text-sm text-gray-700 space-y-1 border-b pb-3 mb-3">
                     <div><span className="font-semibold">الجهة المستلمة:</span> {order.location || '-'}</div>
                     <div><span className="font-semibold">رابط الموقع:</span>{order.mapLink ? (<a href={order.mapLink.startsWith('http') ? order.mapLink : `https://${order.mapLink}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"> فتح الخريطة </a>) : ' -'}</div>
                     <div><span className="font-semibold">اسم المستلم:</span> {order.receiverName || '-'}</div>
                     <div><span className="font-semibold">رقم المستلم:</span> {order.receiverPhone || '-'}</div>
                     <div><span className="font-semibold">موعد التسليم:</span> {formatDateTime(order.deliveryTime)}</div>
                     <div><span className="font-semibold">البريد الإلكتروني للمستخدم:</span> {formatEmail(order.userEmail)}</div>
                     {order.deliveryPerson && <div><span className="font-semibold">مندوب التوصيل:</span> {order.deliveryPerson}</div>}
                     {order.note && <div><span className="font-semibold">ملاحظات الطلب:</span> {order.note}</div>}
                     {order.muraselNote && <div><span className="font-semibold">ملاحظات المراسل:</span> {order.muraselNote}</div>}
                   </div>
                   <div className="pt-2">
                     <div className="text-right font-bold text-md mb-2 text-gray-800">البنود المطلوبة</div>
                     <div className="flex flex-col space-y-2">{order.items?.length > 0 ? (order.items.map((item: OrderItem, idx) => (<div key={idx} className="flex justify-between items-center bg-gray-100 p-3 rounded-xl text-sm"><span className="text-gray-700">{item.name || 'بند غير مسمى'}</span><span className="font-bold text-gray-800">{item.quantity || '?'}</span></div>))) : <div className="text-sm text-gray-500">لا توجد بنود محددة.</div>}</div>
                   </div>
                   <div className="flex justify-center gap-4 border-t pt-4 mt-4">
                     <Link href={`/manager/orders/edit/${order._id}`}><button className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full font-bold transition duration-150 ease-in-out">تعديل</button></Link>
                     <button onClick={() => handleDeleteOrder(order._id)} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition duration-150 ease-in-out">حذف</button>
                   </div>
                 </div>
               ))}
             </div>
           )}
           {loadingOrders && orders.length > 0 && (<div className="text-center py-4"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div></div>)}
           {!hasMore && orders.length > 0 && !loadingOrders && (<div className="text-center text-gray-400 text-sm py-4">تم تحميل جميع الطلبات</div>)}
         </div>
      )}

      {activeTab === 'locations' && (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center">إدارة المواقع</h2>

            <div className="p-6 border rounded-2xl shadow-md bg-white space-y-4" dir="rtl">
                <h3 className="text-lg font-bold text-gray-800">إضافة موقع جديد</h3>
                <InputBox
                    label="اسم الموقع"
                    placeholder="مثال: وزارة التجارة"
                    value={newLocationName}
                    onChange={(val) => setNewLocationName(String(val))}
                />
                <InputBox
                    label="رابط الموقع على الخريطة"
                    placeholder="https://maps.app.goo.gl/..."
                    value={newLocationMapLink}
                    onChange={(val) => setNewLocationMapLink(String(val))}
                />
                <div className="flex justify-end pt-2">
                    <CustomButton
                        text="+ إضافة"
                        color="green"
                        onClick={handleAddLocation}
                    />
                </div>
            </div>

            {loadingLocations ? (
                <div className="text-center py-10"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div></div>
            ) : locations.length === 0 ? (
                <div className="text-center text-gray-500 py-10">لا توجد مواقع محفوظة.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-xl shadow-md">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-3 px-4 text-right">اسم الموقع</th>
                                <th className="py-3 px-4 text-right">رابط الخريطة</th>
                                <th className="py-3 px-4 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map((loc) => (
                                <tr key={loc._id} className="border-t">
                                    <td className="py-3 px-4">{loc.name}</td>
                                    <td className="py-3 px-4">
                                        <a href={loc.mapLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            فتح الرابط
                                        </a>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <button
                                            onClick={() => handleDeleteLocation(loc._id)}
                                            className="px-4 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-sm"
                                        >
                                            حذف
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

    </div>
  );
}

export default auth(AdminPage, ['admin']);