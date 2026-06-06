import { Request, Response } from "express";
import type { AcademicGrade } from "../constants/academicGrades";
import { Student } from "../types/models";
import { validateStudentPayload } from "../utils/validation";
import StudentModel from "../models/studentModel";
import UserModel from "../models/userModel";
import ExamModel from "../models/examModel";


/** يأخذ فقط الحقول المسموحة ويتجاهل أي حقول قديمة مثل email */
function sanitizeStudentBody(body: unknown): Partial<Student> {
  if (!body || typeof body !== "object") {
    return {};
  }
  const b = body as Record<string, unknown>;
  const status = b.status;
  const academicYear = b.academicYear;
  return {
    name: typeof b.name === "string" ? b.name : undefined,
    phone: typeof b.phone === "string" ? b.phone : undefined,
    fatherPhone: typeof b.fatherPhone === "string" ? b.fatherPhone : undefined,
    academicYear:
      typeof academicYear === "string" ? (academicYear as AcademicGrade) : undefined,
    birthday: b.birthday as Student["birthday"],
    status: status === "active" || status === "inactive" ? status : undefined,
    group: typeof b.group === "string" && b.group.trim() !== "" ? b.group : undefined,
  };
}

function parseBirthday(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value.trim());
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export async function getStudents(req: Request, res: Response): Promise<void> {
  const students = await StudentModel.find().populate("group").sort({ createdAt: -1 });
  res.json(students);
}

export async function getStudentById(req: Request, res: Response): Promise<void> {
  const student = await StudentModel.findById(req.params.id).populate("group");

  if (!student) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  res.json(student);
}

export async function createStudent(
  req: Request<unknown, unknown, Partial<Student>>,
  res: Response
): Promise<void> {
  const payload = sanitizeStudentBody(req.body);
  const error = validateStudentPayload(payload);

  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const phoneExists = await StudentModel.findOne({ phone: payload.phone!.trim() });
  if (phoneExists) {
    res.status(409).json({ message: "Phone number already exists." });
    return;
  }

  const birthday = parseBirthday(payload.birthday)!;

  const newStudent = await StudentModel.create({
    name: payload.name!.trim(),
    phone: payload.phone!.trim(),
    fatherPhone: payload.fatherPhone!.trim(),
    academicYear: payload.academicYear!.trim(),
    birthday,
    status: payload.status!,
    group: payload.group,
  });
  
  // Populate group details to return
  await newStudent.populate("group");

  // Auto-create student login account
  try {
    const transliterated = transliterateName(payload.name!.trim());
    const email = transliterated + "@route-academy.com";

    const existingUser = await UserModel.findOne({ email });
    if (!existingUser) {
      const password = generatePassword();
      await UserModel.create({
        name: payload.name!.trim(),
        email,
        password,
        plainPassword: password,
        role: "student",
        studentId: newStudent._id as any,
      });
    }
  } catch (e) {
    console.error("Failed to create student account:", e);
  }
  
  res.status(201).json(newStudent);
}

export async function updateStudent(
  req: Request<{ id: string }, unknown, Partial<Student>>,
  res: Response
): Promise<void> {
  const existingStudent = await StudentModel.findById(req.params.id);
  if (!existingStudent) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  const payload = sanitizeStudentBody(req.body);
  const error = validateStudentPayload(payload);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const duplicatePhone = await StudentModel.findOne({
    phone: payload.phone!.trim(),
    _id: { $ne: req.params.id },
  });

  if (duplicatePhone) {
    res.status(409).json({ message: "Phone number already exists." });
    return;
  }

  const birthday = parseBirthday(payload.birthday)!;

  const updatedStudent = await StudentModel.findByIdAndUpdate(
    req.params.id,
    {
      name: payload.name!.trim(),
      phone: payload.phone!.trim(),
      fatherPhone: payload.fatherPhone!.trim(),
      academicYear: payload.academicYear!.trim(),
      birthday,
      status: payload.status!,
      group: payload.group,
    },
    { new: true }
  ).populate("group");

  res.json(updatedStudent);
}

export async function updateStudentStatus(
  req: Request<{ id: string }, unknown, { status: string }>,
  res: Response
): Promise<void> {
  const { status } = req.body;
  if (status !== "active" && status !== "inactive") {
    res.status(400).json({ message: "Status must be 'active' or 'inactive'." });
    return;
  }

  const updated = await StudentModel.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate("group");

  if (!updated) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  res.json(updated);
}

export async function deleteStudent(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const deletedStudent = await StudentModel.findByIdAndDelete(req.params.id);
  if (!deletedStudent) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  res.status(204).send();
}

export async function studentLogin(
  req: Request<unknown, unknown, { phone: string }>,
  res: Response
): Promise<void> {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ message: "Phone number is required." });
      return;
    }

    const student = await StudentModel.findOne({ phone }).populate("group");
    if (!student) {
      res.status(404).json({ message: "رقم الهاتف غير مسجل في النظام." });
      return;
    }

    res.json({ _id: student._id, name: student.name, phone: student.phone, academicYear: student.academicYear, group: student.group, status: student.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getAvailableExamsForStudent(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { studentId } = req.params;
    const student = await StudentModel.findById(studentId);
    if (!student) {
      res.status(404).json({ message: "Student not found." });
      return;
    }

    const exams = await ExamModel.find()
      .populate("group", "name")
      .sort({ date: 1, startTime: 1 });

    const ExamSubmissionModel = (await import("../models/examSubmissionModel")).default;
    const submissions = await ExamSubmissionModel.find({ student: studentId }).select("exam");
    const submittedExamIds = new Set(submissions.map(s => s.exam.toString()));

    const availableExams = exams.map(exam => ({
      ...exam.toObject(),
      isSubmitted: submittedExamIds.has(exam._id.toString()),
      resultsPublished: exam.resultsPublished ?? false,
    }));

    res.json(availableExams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

function transliterateName(name: string): string {
  const arabicToEnglish: Record<string, string> = {
    ا: "a", أ: "a", إ: "i", آ: "a", ب: "b", ت: "t", ث: "th", ج: "j",
    ح: "h", خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh",
    ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "q",
    ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y", ى: "a",
    ء: "a", ة: "a",
  };

  let result = "";
  for (const char of name) {
    result += arabicToEnglish[char] || char;
  }

  return result
    .replace(/\s+/g, ".")
    .replace(/[^a-zA-Z0-9.]/g, "")
    .toLowerCase()
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")
    .substring(0, 30);
}

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}