import cors from "cors";
import express, { Request, Response } from "express";
import morgan from "morgan";
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
import { isWhatsAppReady, getWhatsAppClient, getCurrentQrCode, getConnectionInfo, sendWhatsAppMessage, endWhatsAppSession } from "./utils/whatsapp";
import WhatsAppMessageLogModel from "./models/whatsappMessageLogModel";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Student management backend is running." });
});

app.get("/api/whatsapp-status", (req: Request, res: Response) => {
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

app.post("/api/test-whatsapp", async (req: Request, res: Response) => {
  const { phone, message } = req.body;
  if (!phone) {
    res.status(400).json({ error: "Phone number required" });
    return;
  }
  const result = await sendWhatsAppMessage(phone, message || "Test message");
  res.json({ success: result });
});

app.get("/api/whatsapp/messages", async (req: Request, res: Response) => {
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

app.post("/api/whatsapp/end-session", async (req: Request, res: Response) => {
  const success = await endWhatsAppSession();
  res.json({ success });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/lectures", lectureRoutes);
app.use("/api/progress", lessonProgressRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error: Error, req: Request, res: Response, next: unknown) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
});

export default app;
