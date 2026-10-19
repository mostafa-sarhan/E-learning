import mongoose from "mongoose";
import { env } from "./env";

mongoose.set("strictQuery", true);

export async function connectToDatabase(): Promise<void> {
  mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected; driver will retry."));
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected."));
  mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  // Never log the URI: it may contain credentials.
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
