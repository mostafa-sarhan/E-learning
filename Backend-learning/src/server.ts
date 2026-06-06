import app from "./app";
import dotenv from "dotenv";
import { connectToDatabase } from "./config/database";
import { initWhatsAppClient } from "./utils/whatsapp";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap(): Promise<void> {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    initWhatsAppClient().catch((err) => {
      console.error("Failed to initialize WhatsApp:", err);
    });
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
