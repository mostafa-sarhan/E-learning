import { Request, Response } from "express";
import PaymentModel from "../models/paymentModel";
import StudentModel from "../models/studentModel";
import { sendWhatsAppMessage, isWhatsAppReady } from "../utils/whatsapp";

export async function getAllPayments(req: Request, res: Response): Promise<void> {
  try {
    const payments = await PaymentModel.find()
      .populate("student", "name") // populate student name for display
      .sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getPaymentsByStudent(req: Request, res: Response): Promise<void> {
  try {
    const { studentId } = req.params;
    const payments = await PaymentModel.find({ student: studentId }).sort({ date: -1 });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function createPayment(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, amount, month } = req.body;

    if (!studentId || amount === undefined || !month) {
      res.status(400).json({ message: "studentId, amount, and month are required." });
      return;
    }

    const newPayment = await PaymentModel.create({
      student: studentId,
      amount: Number(amount),
      month: month.trim(),
      date: new Date(),
    });

    const student = await StudentModel.findById(studentId);
    if (student && student.fatherPhone) {
      sendPaymentWhatsApp(student, newPayment).catch((err) => {
        console.error("Failed to send payment WhatsApp notification:", err);
      });
    }

    res.status(201).json(newPayment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

async function sendPaymentWhatsApp(student: any, payment: any): Promise<void> {
  if (!isWhatsAppReady()) {
    console.log("WhatsApp not ready, skipping payment notification for", student.name);
    return;
  }

  const phone = student.fatherPhone.replace(/[^0-9]/g, "");
  const cleanPhone = phone.startsWith("0") ? phone.slice(1) : phone;
  const finalPhone = cleanPhone.startsWith("20") ? cleanPhone : `20${cleanPhone}`;

  const paymentDate = new Date(payment.date).toLocaleDateString("ar-EG", { year: "numeric", month: "numeric", day: "numeric" });

  const message = `تم دفع مصروفات الطالب / ${student.name}
لشهر / ${payment.month}
تاريخ الدفع / ${paymentDate}
المبلغ المدفوع / ${payment.amount} جنيه

ولسيادتكم جزيل الشكر
* أكاديمية التعليم *`;

  const success = await sendWhatsAppMessage(finalPhone, message, {
    studentName: student.name,
    messageType: "payment",
  });
  if (success) {
    console.log(`Payment WhatsApp sent to ${student.name} (${finalPhone})`);
  } else {
    console.error(`Failed to send payment WhatsApp to ${student.name} (${finalPhone})`);
  }
}

export async function deletePayment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await PaymentModel.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Payment not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}
