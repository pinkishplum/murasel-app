'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InputBox from '@/app/components/InputBox';
import CustomButton from '@/app/components/CustomButton';
import toast from 'react-hot-toast';
import auth from '@/app/components/auth';
import {useSession} from "next-auth/react";

interface OrderItem {
  name: string;
  quantity: number;
}

interface Location {
  _id: string;
  name: string;
  mapLink: string;
}

type InputValue = string | number;

function EditOrderPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const {data: session} = useSession()

  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ name: '', quantity: 1 }]);
  const [loading, setLoading] = useState(true);

  const [locationsList, setLocationsList] = useState<Location[]>([]);
  const [isFetchingLocations, setIsFetchingLocations] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      const data = await res.json();

      setCustomerName(data.customerName || '');
      setLocation(data.location || '');
      setMapLink(data.mapLink || '');
      
      if (data.deliveryTime) {
        try {
           const date = new Date(data.deliveryTime);
           const year = date.getFullYear();
           const month = String(date.getMonth() + 1).padStart(2, '0');
           const day = String(date.getDate()).padStart(2, '0');
           const hours = String(date.getHours()).padStart(2, '0');
           const minutes = String(date.getMinutes()).padStart(2, '0');
           setDeliveryTime(`${year}-${month}-${day}T${hours}:${minutes}`);
        } catch {
           setDeliveryTime('');
        }
      }
      
      setReceiverName(data.receiverName || '');
      setReceiverPhone(data.receiverPhone || '');
      setNote(data.note || '');
      setItems(data.items && data.items.length > 0 ? data.items : [{ name: '', quantity: 1 }]);
    } catch (error) {
      console.error(' Failed to load order:', error);
      toast.error(' فشل تحميل الطلب');
      router.push('/manager');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    async function fetchLocations() {
      setIsFetchingLocations(true);
      try {
        const res = await fetch('/api/locations');
        if (!res.ok) throw new Error('Failed to fetch locations');
        setLocationsList(await res.json());
      } catch (error) {
        console.error(error);
        toast.error('فشل في تحميل قائمة المواقع');
      } finally {
        setIsFetchingLocations(false);
      }
    }
    fetchLocations();
  }, []);

  useEffect(() => {
    if (location && locationsList.length > 0) {
      const matchingLocation = locationsList.find(loc => loc.name === location && loc.mapLink === mapLink);
      if (matchingLocation) {
        setSelectedLocationId(matchingLocation._id);
      } else {
        setSelectedLocationId('');
      }
    }
  }, [location, mapLink, locationsList]);


  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setSelectedLocationId(selectedId);
    const selected = locationsList.find(loc => loc._id === selectedId);
    if (selected) {
      setLocation(selected.name);
      setMapLink(selected.mapLink);
    }
  };
  
  const handleLocationTextInput = (value: string) => {
    setLocation(value);
    setSelectedLocationId(''); // It's now a custom value
  };

  const addNewItem = () => setItems((prev) => [...prev, { name: '', quantity: 1 }]);
  const removeLastItem = () => {
    if (items.length > 1) setItems((prev) => prev.slice(0, -1));
  };
  const handleItemChange = (index: number, field: keyof OrderItem, value: InputValue) => {
    const newItems = [...items];
    const currentItem = { ...newItems[index] };
    if (field === 'quantity') {
      currentItem.quantity = Math.max(0, Number(value));
    } else {
      currentItem.name = String(value);
    }
    newItems[index] = currentItem;
    setItems(newItems);
  };
  
  const handleSubmit = async () => {
    if (!customerName || !location || !deliveryTime || items.some(item => !item.name || item.quantity <= 0)) {
      toast.error(' تأكد من تعبئة جميع الحقول بشكل صحيح');
      return;
    }
    const toastId = toast.loading('جاري حفظ التعديلات...');
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, location, mapLink, deliveryTime, receiverName, receiverPhone, note, items }),
      });

      if (!res.ok) throw new Error('Failed to update order');
      toast.success(' تم حفظ الطلب بنجاح', { id: toastId });

      const destination = session?.user.role === 'admin' ? '/admin' : '/manager';
      router.push(destination);
      
    } catch (err) {
      console.error(' Error updating order:', err);
      toast.error(' فشل في حفظ الطلب', { id: toastId });
    }
  };

  if (loading) {
    return <div className="text-center p-10">...جاري التحميل</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 max-w-3xl mx-auto" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">تعديل الطلب</h2>
      <InputBox label="مقدم الطلب" placeholder="فلان الفلاني" value={customerName} onChange={(val) => setCustomerName(String(val))} />
      
      {/* --- Location Dropdown --- */}
      <div className="flex flex-col w-full space-y-2">
        <label className="text-right font-bold text-md text-gray-700">المواقع المحفوظة (اختياري)</label>
        <select
          value={selectedLocationId}
          onChange={handleLocationSelect}
          disabled={isFetchingLocations}
          className="w-full rounded-full border border-gray-300 p-4 text-right text-md focus:outline-none focus:border-blue-500 appearance-none bg-white"
        >
          <option value="">
            {isFetchingLocations ? '...جاري تحميل المواقع' : 'اختر موقعاً للتعبئة التلقائية'}
          </option>
          {locationsList.map(loc => (
            <option key={loc._id} value={loc._id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <InputBox label="الجهة المستلمة" placeholder="صندوق التنمية الصناعي" value={location} onChange={(val) => handleLocationTextInput(String(val))} />
      <InputBox label="رابط الموقع" placeholder="https://maps.app.goo..." value={mapLink} onChange={(val) => setMapLink(String(val))} />
      <InputBox label="موعد التسليم" type="datetime-local" value={deliveryTime} onChange={(val) => setDeliveryTime(String(val))} />
      <InputBox label="اسم ممثل الجهة" placeholder="فلان الفلاني" value={receiverName} onChange={(val) => setReceiverName(String(val))} />
      <InputBox label="رقم التواصل لممثل الجهة" placeholder="+966 50 8351 293" value={receiverPhone} onChange={(val) => setReceiverPhone(String(val))} />

      <div className="flex flex-col w-full space-y-2">
        <label className="text-right font-bold text-md text-gray-700">ملاحظة مقدم الطلب</label>
        <textarea
          placeholder="ملاحظتك هنا..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-2xl border border-gray-300 p-4 text-md text-right focus:outline-none focus:border-blue-500 min-h-[100px]"
        />
      </div>

      <div className="flex flex-col w-full space-y-4 pt-6">
        <h3 className="text-right font-bold text-lg text-gray-700">البنود</h3>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-2 rtl:space-x-reverse">
            <input
              className="flex-1 rounded-2xl border border-gray-300 p-4 text-md text-right focus:outline-none focus:border-blue-500"
              placeholder="اسم البند"
              value={item.name}
              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
            />
            <input
              type="number"
              min="1"
              className="w-24 rounded-2xl border border-gray-300 p-4 text-md text-center focus:outline-none focus:border-blue-500"
              placeholder="عدد"
              value={item.quantity}
              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
            />
          </div>
        ))}
        <div className="flex justify-end space-x-2 rtl:space-x-reverse">
          <button type="button" onClick={removeLastItem} disabled={items.length <= 1} className="text-3xl text-white bg-red-400 hover:bg-red-600 disabled:bg-gray-300 w-10 h-10 rounded-full flex items-center justify-center transition" aria-label="Remove last item">-</button>
          <button type="button" onClick={addNewItem} className="text-3xl text-white bg-blue-400 hover:bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center transition" aria-label="Add new item">+</button>
        </div>
      </div>

      <div className="flex space-x-4 pt-6 rtl:space-x-reverse">
        <CustomButton text="إلغاء" color="red" size="large" onClick={() => router.back()} />
        <CustomButton text="حفظ التعديلات" color="green" size="large" onClick={handleSubmit} />
      </div>
    </div>
  );
}

export default auth(EditOrderPage, ['manager', 'admin']);
