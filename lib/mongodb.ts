import mongoose from 'mongoose';

export async function connectMongo() {
  if (mongoose.connections[0].readyState) return; // Already connected

  const mongoUri = process.env.MONGODB_URI || "mongodb+srv://ziyadmowafy:798H190XJYnZK7Xp@cluster0.zhuc8ik.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

  try {
    await mongoose.connect(mongoUri);
    console.log(' Connected to MongoDB');
  } catch (error) {
    console.error(' MongoDB connection error:', error);
    throw new Error('MongoDB connection failed');
  }
}
