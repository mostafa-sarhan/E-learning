import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/students";
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoUri}`);
}
