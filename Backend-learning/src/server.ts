import { env } from "./config/env";
import app from "./app";
import mongoose from "mongoose";
import { connectToDatabase } from "./config/database";
import { initWhatsAppClient, shutdownWhatsApp } from "./utils/whatsapp";

async function bootstrap(): Promise<void> {
  await connectToDatabase();
  const server = app.listen(env.port, env.host, () => {
    console.log(`Server is running on http://${env.host}:${env.port}`);
    if (env.whatsappEnabled) {
      initWhatsAppClient().catch((err) => {
        console.error("Failed to initialize WhatsApp:", err?.message || err);
      });
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down.`);
    server.close();
    await shutdownWhatsApp();
    mongoose.connection.removeAllListeners("disconnected");
    await mongoose.connection.close().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason: any) => {
  console.error("Unhandled rejection:", reason?.message || reason);
});

bootstrap().catch((error) => {
  console.error("Failed to start server:", error?.message || error);
  process.exit(1);
});
