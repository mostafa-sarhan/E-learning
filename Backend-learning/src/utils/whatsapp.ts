import { Client, LocalAuth } from "whatsapp-web.js";
import fs from "fs";
import path from "path";
import WhatsAppMessageLogModel from "../models/whatsappMessageLogModel";
import { env } from "../config/env";

const sessionPath = path.resolve(env.whatsappSessionPath);
let initializing: Promise<void> | null = null;

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

// Remove a stale Chromium lock left by a crashed process. Scoped to this app's session
// directory only, so other projects on the same host are never affected.
function clearStaleBrowserLock(): void {
  for (const dir of [sessionPath, path.join(sessionPath, "session")]) {
    for (const lock of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
      try {
        fs.rmSync(path.join(dir, lock), { force: true });
      } catch {
        // ignore
      }
    }
  }
}

export function initWhatsAppClient(): Promise<void> {
  if (client) return Promise.resolve();
  // Prevent duplicate concurrent initialization.
  if (!initializing) {
    initializing = startClient().finally(() => {
      initializing = null;
    });
  }
  return initializing;
}

async function startClient(): Promise<void> {
  if (env.chromiumPath && !fs.existsSync(env.chromiumPath)) {
    console.error("WhatsApp disabled: PUPPETEER_EXECUTABLE_PATH does not exist.");
    return;
  }
  try {
    // Session data (WhatsApp credentials) must persist and stay private to this app.
    fs.mkdirSync(sessionPath, { recursive: true, mode: 0o700 });
    clearStaleBrowserLock();

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: {
        headless: true,
        executablePath: env.chromiumPath,
        args: [
          ...(env.chromeNoSandbox ? ["--no-sandbox", "--disable-setuid-sandbox"] : []),
          "--disable-gpu",
          "--disable-dev-shm-usage",
        ],
      },
    });

    client.on("qr", (qr) => {
      // QR is exposed only to authenticated staff via /api/whatsapp-status; never logged.
      currentQrCode = qr;
      console.log("WhatsApp QR code generated; scan it from the dashboard.");
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

    client.on("auth_failure", () => {
      console.error("WhatsApp auth failed.");
      isReady = false;
      client = null;
      currentQrCode = null;
      connectionTime = null;
      phoneNumber = null;
    });

    client.on("error", (err) => {
      console.error("WhatsApp client error:", err?.message || err);
      isReady = false;
      client = null;
      currentQrCode = null;
      connectionTime = null;
      phoneNumber = null;
    });

    await client.initialize();
  } catch (error: any) {
    console.error("Failed to initialize WhatsApp client:", error?.message || error);
    try {
      await client?.destroy();
    } catch {
      // ignore
    }
    client = null;
    isReady = false;
  }
}

export async function shutdownWhatsApp(): Promise<void> {
  if (!client) return;
  try {
    client.removeAllListeners();
    await client.destroy();
  } catch {
    // ignore
  }
  client = null;
  isReady = false;
}

export async function generateNewQR(): Promise<void> {
  try {
    if (client) {
      client.removeAllListeners();
      try {
        await client.destroy();
      } catch {}
    }
  } catch {}
  isReady = false;
  client = null;
  currentQrCode = null;
  connectionTime = null;
  phoneNumber = null;
  await initWhatsAppClient();
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

    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    initWhatsAppClient().catch((err) => {
      console.error("Failed to reinitialize WhatsApp after end-session:", err?.message || err);
    });

    return true;
  } catch (error) {
    console.error("Failed to end WhatsApp session:", (error as Error)?.message);
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
    await client.sendMessage(chatId, message);
    success = true;
  } catch (error: any) {
    // Do not log phone numbers or message contents.
    console.error("Failed to send WhatsApp message:", error?.message || error);
    success = false;
  }

  if (logMetadata?.studentName && logMetadata?.messageType) {
    try {
      await WhatsAppMessageLogModel.create({
        studentName: logMetadata.studentName,
        parentPhone: phone,
        messageType: logMetadata.messageType as any,
        deliveryStatus: success ? "sent" : "failed",
        sentAt: new Date(),
      });
    } catch (logError) {
      console.error("Failed to log WhatsApp message:", logError);
    }
  }

  return success;
}
