import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import WhatsAppMessageLogModel from "../models/whatsappMessageLogModel";

const execAsync = promisify(exec);

let client: Client | null = null;
let isReady = false;
let currentQrCode: string | null = null;
let connectionTime: string | null = null;
let phoneNumber: string | null = null;

export function getWhatsAppClient(): Client | null {
  return client;
}

export function isWhatsAppReady(): boolean {
  return isReady;
}

export function getCurrentQrCode(): string | null {
  return currentQrCode;
}

export function getConnectionInfo(): { phoneNumber: string | null; connectionTime: string | null } {
  return { phoneNumber, connectionTime };
}

async function killExistingBrowser(): Promise<void> {
  try {
    await execAsync("pkill -f '.wwebjs_auth' || true");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch {
    // Ignore errors - no process might be running
  }
}

export async function initWhatsAppClient(): Promise<void> {
  if (client) return;

  try {
    await killExistingBrowser();

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      },
    });

    client.on("qr", (qr) => {
      currentQrCode = qr;
      console.log("\n=== WhatsApp QR Code ===");
      qrcode.generate(qr, { small: true });
      console.log("Scan the QR code above with WhatsApp\n");
    });

    client.on("ready", () => {
      console.log("WhatsApp client is ready!");
      isReady = true;
      currentQrCode = null;
      connectionTime = new Date().toISOString();
      if (client?.info) {
        const wid = (client.info as any).wid || (client.info as any).me;
        phoneNumber = wid?.user || wid?.id?.user || null;
      }
    });

    client.on("disconnected", (reason) => {
      console.log("WhatsApp client disconnected:", reason);
      isReady = false;
      client = null;
      currentQrCode = null;
      connectionTime = null;
      phoneNumber = null;
    });

    client.on("auth_failure", (msg) => {
      console.error("WhatsApp auth failed:", msg);
      isReady = false;
      client = null;
      currentQrCode = null;
      connectionTime = null;
      phoneNumber = null;
    });

    client.on("error", (err) => {
      console.error("WhatsApp client error:", err);
      isReady = false;
      client = null;
      currentQrCode = null;
      connectionTime = null;
      phoneNumber = null;
    });

    await client.initialize();
  } catch (error: any) {
    if (error.message?.includes("already running")) {
      console.log("Browser already running, attempting to kill and retry...");
      await killExistingBrowser();
      client = null;
      return initWhatsAppClient();
    }
    console.error("Failed to initialize WhatsApp client:", error);
    client = null;
  }
}

export async function endWhatsAppSession(): Promise<boolean> {
  try {
    if (client) {
      client.removeAllListeners();
      try {
        await client.destroy();
      } catch {}
    }

    isReady = false;
    client = null;
    currentQrCode = null;
    connectionTime = null;
    phoneNumber = null;

    const authPath = path.resolve(".wwebjs_auth");
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
    }

    initWhatsAppClient().catch((err) => {
      console.error("Failed to reinitialize WhatsApp after end-session:", err);
    });

    return true;
  } catch (error) {
    console.error("Failed to end WhatsApp session:", error);
    return false;
  }
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  logMetadata?: { studentName?: string; messageType?: string }
): Promise<boolean> {
  if (!client) {
    console.error("WhatsApp client is not initialized");
    return false;
  }
  
  if (!isReady) {
    console.error("WhatsApp client is not ready - have you scanned the QR code?");
    return false;
  }

  let success = false;
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const chatId = `${cleanPhone}@c.us`;
    console.log(`Attempting to send message to chatId: ${chatId}`);
    
    const result = await client.sendMessage(chatId, message);
    console.log(`Message sent successfully to ${cleanPhone}, message ID: ${result.id._serialized}`);
    success = true;
  } catch (error: any) {
    console.error(`Failed to send message to ${phone}:`, error.message || error);
    console.error("Full error:", error);
    success = false;
  }

  if (logMetadata?.studentName && logMetadata?.messageType) {
    try {
      await WhatsAppMessageLogModel.create({
        studentName: logMetadata.studentName,
        parentPhone: phone,
        messageType: logMetadata.messageType,
        deliveryStatus: success ? "sent" : "failed",
        sentAt: new Date(),
      });
    } catch (logError) {
      console.error("Failed to log WhatsApp message:", logError);
    }
  }

  return success;
}
