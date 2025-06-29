'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import InputBox from '@/app/components/InputBox';
import CustomButton from '@/app/components/CustomButton';
import toast from "react-hot-toast";
import { useSearchParams } from 'next/navigation';
import auth from '@/app/components/auth';

// Define interfaces for our data structures
interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
}

interface Location {
  _id: string;
  name: string;
  mapLink: string;
}

interface OrderFormData {
  customerName?: string;
  location?: string;
  mapLink?: string;
  deliveryTime?: string;
  receiverName?: string;
  receiverPhone?: string;
  note?: string;
  items?: OrderItem[];
}

type InputValue = string | number;

// This wrapper component for handling pre-filled data remains unchanged
function SearchParamsWrapper({ onDataLoad }: { onDataLoad: (data: OrderFormData) => void }) {
  const searchParams = useSearchParams();
  const rawData = searchParams.get('data');

  useEffect(() => {
    if (rawData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawData));
        onDataLoad(parsed);
      } catch (e) {
        console.error('Failed to parse prefill data', e);
        onDataLoad({});
      }
    }
  }, [rawData, onDataLoad]);

  return null;
}

function NewOrderPage() {
  const router = useRouter();

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ name: '', quantity: 1 }]);

  // State for the locations dropdown
  const [locationsList, setLocationsList] = useState<Location[]>([]);
  const [isFetchingLocations, setIsFetchingLocations] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState('');


  // Fetch locations from the DB for the dropdown
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/locations');
        if (!res.ok) throw new Error('Failed to fetch locations');
        const data = await res.json();
        setLocationsList(data);
      } catch (error) {
        console.error(error);
        toast.error('فشل في تحميل قائمة المواقع');
      } finally {
        setIsFetchingLocations(false);
      }
    }
    fetchLocations();
  }, []);

  const handleDataLoad = useCallback((data: OrderFormData) => {
    setCustomerName(data.customerName || '');
    setLocation(data.location || '');
    setMapLink(data.mapLink || '');
    setReceiverName(data.receiverName || '');
    setReceiverPhone(data.receiverPhone || '');
    setNote(data.note || '');
    setItems(data.items && data.items.length > 0 ? data.items : [{ name: '', quantity: 1 }]);
  }, []);

  // NEW: Handler for the location dropdown
  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      setSelectedLocationId(selectedId); // Keep track of the selected ID

      const selectedLocation = locationsList.find(loc => loc._id === selectedId);

      if (selectedLocation) {
          // If a location is selected, auto-fill the inputs
          setLocation(selectedLocation.name);
          setMapLink(selectedLocation.mapLink);
      }
  };

  // NEW: Handler for when the user types in the location input manually
  const handleLocationTextInput = (value: string) => {
      setLocation(value);
      // If the user types, it's a custom location, so deselect from dropdown
      setSelectedLocationId('');
  }

  // Other handlers remain the same
  const addNewItem = () => setItems((prev) => [...prev, { name: '', quantity: 1 }]);
  const removeLastItem = () => {
    if (items.length > 1) setItems((prev) => prev.slice(0, -1));
  };
  const handleItemChange = (index: number, field: keyof OrderItem, value: InputValue) => {
    const newItems = items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    setItems(newItems);
  };
  const handleSubmit = async () => {
    if (!customerName || !location || !deliveryTime || items.some(item => !item.name || item.quantity <= 0)) {
      toast.error(' تأكد من تعبئة جميع الحقول بشكل صحيح');
      return;
    }
    const toastId = toast.loading("جاري إرسال الطلب...");
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, location, mapLink, deliveryTime, receiverName, receiverPhone, note, items }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to submit order' }));
        throw new Error(errorData.message || 'Failed to submit order');
      }
      toast.success(' تم إرسال الطلب بنجاح', { id: toastId });
      router.push('/manager');
    } catch (err) {
      toast.error((err as Error).message || ' فشل إرسال الطلب', { id: toastId });
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6" dir="rtl">
      <Suspense fallback={<div>Loading...</div>}>
        <SearchParamsWrapper onDataLoad={handleDataLoad} />
      </Suspense>

      <InputBox label="مقدم الطلب" placeholder="فلان الفلاني" value={customerName} onChange={(val) => setCustomerName(String(val))} />

      {/* --- Location Dropdown (acts as a helper) --- */}
      <div className="flex flex-col w-full space-y-2">
        <label className="text-right font-bold text-md text-gray-700">المواقع المحفوظة</label>
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

      {/* --- Location and Map Link Inputs (always visible) --- */}
      <InputBox label="الجهة المستلمة" placeholder="اكتب اسم الموقع هنا" value={location} onChange={(val) => handleLocationTextInput(String(val))} />
      <InputBox label="رابط الموقع" placeholder="اكتب رابط الموقع هنا" value={mapLink} onChange={(val) => setMapLink(String(val))} />

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
        {items.map((item, index) => (
          <div key={index} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 rtl:space-x-reverse">
            <input
              className="flex-1 rounded-2xl border border-gray-300 p-4 text-md text-right focus:outline-none focus:border-blue-500"
              placeholder="اسم البند"
              value={item.name}
              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
            />
            <input
              type="number"
              className="w-full sm:w-24 rounded-2xl border border-gray-300 p-4 text-md text-center focus:outline-none focus:border-blue-500"
              placeholder="عدد"
              value={item.quantity}
              min="1"
              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
            />
          </div>
        ))}
        <div className="flex justify-end space-x-2 rtl:space-x-reverse">
          <button type="button" onClick={removeLastItem} className="text-3xl text-white bg-red-400 hover:bg-red-600 w-10 h-10 rounded-full flex items-center justify-center">-</button>
          <button type="button" onClick={addNewItem} className="text-3xl text-white bg-blue-400 hover:bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center">+</button>
        </div>
      </div>

      <div className="flex space-x-4 rtl:space-x-reverse pt-6">
        <CustomButton text="إلغاء" color="red" size="large" onClick={() => router.push('/manager')} />
        <CustomButton text="تقديم الطلب" color="green" size="large" onClick={handleSubmit} />
      </div>
    </div>
  );
}

export default auth(NewOrderPage, ['manager', 'admin']);
