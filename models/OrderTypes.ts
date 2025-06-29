// Define status constants to ensure consistency
export const ORDER_STATUS = {
  NEW: 'جديد',
  IN_PROGRESS: 'قيد التنفيذ',
  DELIVERED: 'تم التوصيل',
  DELIVERED_LATE: 'توصيل متأخر',
  LATE: 'متأخر',
  NOT_RECEIVED: 'لم يتم الاستلام'
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// Define the OrderItem interface
export interface OrderItem {
  name: string;
  quantity: number;
}

// Define the unified Order interface
export interface Order {
  _id: string;
  customerName: string;
  location: string;
  mapLink: string;
  deliveryTime: string;
  receiverName: string;
  receiverPhone: string;
  note?: string;
  muraselNote?: string;
  items: OrderItem[];
  status: OrderStatus;
  userEmail: string;
  deliveryPerson?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}
