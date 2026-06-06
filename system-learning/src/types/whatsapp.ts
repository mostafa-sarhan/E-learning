export interface WhatsAppStatus {
  connected: boolean;
  phoneNumber: string | null;
  connectionTime: string | null;
}

export interface QRCodeData {
  qrValue: string;
  expiresIn: number;
}

export type MessageType = "attendance" | "absence" | "exam_result" | "payment";

export type DeliveryStatus = "sent" | "delivered" | "failed";

export interface RecentMessage {
  id: string;
  studentName: string;
  parentPhone: string;
  messageType: MessageType;
  deliveryStatus: DeliveryStatus;
  sentAt: string;
}
