import mongoose, { Document, Model, Schema } from 'mongoose';

// Interface for type safety
export interface ILocation extends Document {
  name: string;
  mapLink: string;
}

const LocationSchema = new Schema({
  name: { type: String, required: true },
  mapLink: { type: String, required: true },
}, { timestamps: true });

export const Locations: Model<ILocation> = mongoose.models.Locations || mongoose.model<ILocation>('Locations', LocationSchema);