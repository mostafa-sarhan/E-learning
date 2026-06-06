import { Request, Response } from "express";
import ExamModel from "../models/examModel";
import ExamSubmissionModel from "../models/examSubmissionModel";
import { sendWhatsAppMessage, isWhatsAppReady } from "../utils/whatsapp";

export async function getExams(req: Request, res: Response): Promise<void> {
  try {
    const exams = await ExamModel.find()
      .populate("group", "name")
      .sort({ date: -1, startTime: -1 });
    
    // Add submission counts
    const ExamSubmissionModel = require("../models/examSubmissionModel").default;
    const examsWithCounts = await Promise.all(
      exams.map(async (exam) => {
        const submissionCount = await ExamSubmissionModel.countDocuments({ exam: exam._id });
        return {
          ...exam.toObject(),
          submissionCount,
        };
      })
    );
    
    res.json(examsWithCounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getExamById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const exam = await ExamModel.findById(id).populate("group", "name");
    if (!exam) {
      res.status(404).json({ message: "Exam not found." });
      return;
    }
    res.json(exam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function createExam(req: Request, res: Response): Promise<void> {
  try {
    const { title, academicYear, group, date, startTime, durationMins } = req.body;

    if (!title || !academicYear || !group || !date || !startTime || !durationMins) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    const newExam = await ExamModel.create({
      title,
      academicYear,
      group,
      date: new Date(date),
      startTime,
      durationMins: Number(durationMins),
    });

    res.status(201).json(newExam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function deleteExam(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await ExamModel.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Exam not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function toggleResults(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { resultsPublished } = req.body;
    const exam = await ExamModel.findById(id);
    if (!exam) {
      res.status(404).json({ message: "Exam not found." });
      return;
    }
    exam.resultsPublished = resultsPublished;
    await exam.save();
    res.json(exam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function sendResultsWhatsApp(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!isWhatsAppReady()) {
      res.status(503).json({ message: "WhatsApp is not connected. Please scan QR code first." });
      return;
    }

    const exam = await ExamModel.findById(id);
    if (!exam) {
      res.status(404).json({ message: "Exam not found." });
      return;
    }

    const submissions = await ExamSubmissionModel.find({ exam: id }).populate("student", "name fatherPhone");

    if (submissions.length === 0) {
      res.status(404).json({ message: "No submissions found for this exam." });
      return;
    }

    const results: { studentName: string; success: boolean; phone?: string }[] = [];

    for (const sub of submissions) {
      const student = sub.student as any;
      if (!student || !student.fatherPhone) {
        results.push({ studentName: student?.name || "Unknown", success: false });
        continue;
      }

      const phone = student.fatherPhone.replace(/[^0-9]/g, "");
      const cleanPhone = phone.startsWith("0") ? phone.slice(1) : phone;
      const finalPhone = cleanPhone.startsWith("20") ? cleanPhone : `20${cleanPhone}`;
      console.log(`Processing student: ${student.name}, Phone: ${finalPhone}`);

      const message = `السلام عليكم
نود علم سيادتكم بان الطالب / ${student.name}
قد حصل علي درجه ${sub.score}/${sub.totalPoints} في الامتحان
مع تحيات أكاديميه التعليم`;

      const success = await sendWhatsAppMessage(finalPhone, message, {
        studentName: student.name,
        messageType: "exam_result",
      });
      results.push({ studentName: student.name, success, phone: finalPhone });
    }

    const sentCount = results.filter(r => r.success).length;
    res.json({ message: `Sent ${sentCount}/${results.length} messages`, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}
