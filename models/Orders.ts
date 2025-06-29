import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  location: { type: String, required: true },
  mapLink: { type: String, required: true },
  deliveryTime: { type: Date, required: true },
  receiverName: { type: String, required: true },
  receiverPhone: { type: String, required: true },
  note: { type: String },
  startedAt: { type: Date },
  endedAt: { type: Date },
  muraselNote: { type: String },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
    }
  ],
  userEmail: { type: String, required: true },
  deliveryPerson: { type: String },
  status: {
    type: String,
    enum: ['جديد', 'قيد التنفيذ', 'تم التوصيل', 'متأخر', 'توصيل متأخر', 'لم يتم الاستلام'],
    default: 'جديد',
  },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
