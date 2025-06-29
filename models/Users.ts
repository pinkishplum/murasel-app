import mongoose, { Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name?: string;
  image?: string;
  role: 'admin' | 'manager' | 'murasel' | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  image: { type: String },
  role: {
    type: String,
    enum: ['manager', 'murasel', 'admin', null],
    default: null
  },
}, { timestamps: true });

export const Users: Model<IUser> = mongoose.models.Users || mongoose.model<IUser>('Users', UserSchema);