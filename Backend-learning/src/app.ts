import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { requireAuth, requireAdmin, requireStaff } from "./middleware/auth";
import { apiLimiter, authLimiter, rejectMongoOperators, sensitiveLimiter, whatsappLimiter } from "./middleware/security";
import courseRoutes from "./routes/courseRoutes";
import enrollmentRoutes from "./routes/enrollmentRoutes";
import studentRoutes from "./routes/studentRoutes";
import groupRoutes from "./routes/groupRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import examRoutes from "./routes/examRoutes";
import sessionRoutes from "./routes/sessionRoutes";
import lectureRoutes from "./routes/lectureRoutes";
import lessonProgressRoutes from "./routes/lessonProgressRoutes";
import authRoutes from "./routes/authRoutes";
import { isWhatsAppReady, getWhatsAppClient, getCurrentQrCode, getConnectionInfo, sendWhatsAppMessage, endWhatsAppSession, generateNewQR } from "./utils/whatsapp";
import WhatsAppMessageLogModel from "./models/whatsappMessageLogModel";

const app = express();

app.disable("x-powered-by");
// Only trust X-Forwarded-For from the configured number of proxy hops (Nginx).
app.set("trust proxy", env.trustProxy);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no Origin header) and configured origins only.
      callback(null, !origin || env.corsOrigins.includes(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: env.bodyLimit }));
app.use(morgan(env.isProduction ? "combined" : "dev"));
app.use("/api", apiLimiter);
app.use(rejectMongoOperators);

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Student management backend is running." });
});

app.get("/api/whatsapp-status", requireAuth, requireStaff, (req: Request, res: Response) => {
  const client = getWhatsAppClient();
  const { phoneNumber, connectionTime } = getConnectionInfo();
  res.json({
    connected: isWhatsAppReady(),
    initialized: client !== null,
    whatsappState: client?.info ? "connected" : "disconnected",
    phoneNumber,
    connectionTime,
    qrCode: getCurrentQrCode(),
  });
});

app.post("/api/test-whatsapp", requireAuth, requireAdmin, whatsappLimiter, async (req: Request, res: Response) => {
  const { phone, message } = req.body;
  if (typeof phone !== "string" || !phone || (message !== undefined && typeof message !== "string")) {
    res.status(400).json({ error: "Phone number required" });
    return;
  }
  const result = await sendWhatsAppMessage(phone, message || "Test message");
  res.json({ success: result });
});

app.get("/api/whatsapp/messages", requireAuth, requireStaff, async (req: Request, res: Response) => {
  try {
    const messages = await WhatsAppMessageLogModel.find()
      .sort({ sentAt: -1 })
      .limit(50)
      .lean();
    const mapped = messages.map((msg: any) => ({
      id: msg._id.toString(),
      studentName: msg.studentName,
      parentPhone: msg.parentPhone,
      messageType: msg.messageType,
      deliveryStatus: msg.deliveryStatus,
      sentAt: msg.sentAt,
    }));
    res.json(mapped);
  } catch (error) {
    console.error("Failed to fetch WhatsApp messages:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.post("/api/whatsapp/end-session", requireAuth, requireStaff, whatsappLimiter, async (req: Request, res: Response) => {
  const success = await endWhatsAppSession();
  res.json({ success });
});

app.post("/api/whatsapp/generate-qr", requireAuth, requireStaff, whatsappLimiter, async (req: Request, res: Response) => {
  try {
    await generateNewQR();
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

app.post("/api/auth/login", authLimiter);
app.use("/api/auth", authRoutes);
// Everything below requires a valid token; per-route role checks live in the routers.
app.use("/api", requireAuth);
app.use("/api/students", studentRoutes);
app.use("/api/courses", requireStaff, courseRoutes);
app.use("/api/enrollments", requireStaff, enrollmentRoutes);
app.use("/api/groups", requireStaff, groupRoutes);
app.use("/api/attendance", requireStaff, attendanceRoutes);
app.use("/api/payments", requireStaff, paymentRoutes);
app.use("/api/expenses", requireAdmin, sensitiveLimiter, expenseRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/sessions", requireStaff, sessionRoutes);
app.use("/api/lectures", lectureRoutes);
app.use("/api/progress", lessonProgressRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON body." });
    return;
  }
  if (error?.type === "entity.too.large") {
    res.status(413).json({ message: "Request body too large." });
    return;
  }
  if (error?.name === "CastError" || error?.name === "ValidationError") {
    res.status(400).json({ message: "Invalid request data." });
    return;
  }
  console.error(env.isProduction ? `${error?.name}: ${error?.message}` : error);
  res.status(500).json({ message: "Internal server error." });
});

export default app;
