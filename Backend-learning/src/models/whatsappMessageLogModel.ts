import { Schema, model } from "mongoose";

const whatsappMessageLogSchema = new Schema(
  {
    studentName: { type: String, required: true },
    parentPhone: { type: String, required: true },
    messageType: { type: String, required: true, enum: ["attendance", "absence", "exam_result", "payment"] },
    deliveryStatus: { type: String, required: true, enum: ["sent", "failed"] },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const WhatsAppMessageLogModel = model("WhatsAppMessageLog", whatsappMessageLogSchema);

export default WhatsAppMessageLogModel;
