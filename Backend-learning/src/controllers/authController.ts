import { Request, Response } from "express";
import UserModel from "../models/userModel";
import StudentModel from "../models/studentModel";
import GroupModel from "../models/groupModel";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "البريد الإلكتروني وكلمة المرور مطلوبين." });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ message: "البريد الإلكتروني غير مسجل." });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "كلمة المرور غير صحيحة." });
      return;
    }

    let studentData = null;
    if (user.role === "student" && user.studentId) {
      const student = await StudentModel.findById(user.studentId).populate("group");
      if (student) {
        studentData = {
          _id: student._id,
          name: student.name,
          academicYear: student.academicYear,
          group: student.group,
          phone: student.phone,
        };
      }
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      student: studentData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ message: "البريد الإلكتروني مسجل بالفعل." });
      return;
    }

    const user = await UserModel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
    });

    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await UserModel.find().sort({ createdAt: -1 });
    const result = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      plainPassword: u.plainPassword || null,
      studentId: u.studentId,
      createdAt: u.createdAt,
    }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getStudentAccounts(req: Request, res: Response): Promise<void> {
  try {
    const studentUsers = await UserModel.find({ role: "student" })
      .populate({
        path: "studentId",
        select: "name phone academicYear group",
        populate: { path: "group", select: "name" },
      })
      .sort({ createdAt: -1 });

    const result = studentUsers.map(u => {
      const s = u.studentId as any;
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        plainPassword: u.plainPassword || "غير متوفر",
        academicYear: s?.academicYear || "غير محدد",
        group: s?.group?.name || "غير محدد",
        phone: s?.phone || "—",
        createdAt: u.createdAt,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !["admin", "employee", "student"].includes(role)) {
      res.status(400).json({ message: "Invalid role." });
      return;
    }

    const updated = await UserModel.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-password");

    if (!updated) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await UserModel.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function createStudentAccount(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, name } = req.body;
    if (!studentId || !name) {
      res.status(400).json({ message: "studentId and name are required." });
      return;
    }

    const transliterated = transliterateName(name);
    const email = transliterated + "@route-academy.com";

    const existing = await UserModel.findOne({ email });
    if (existing) {
      res.json({ _id: existing._id, name: existing.name, email: existing.email, password: existing.plainPassword || null });
      return;
    }

    const password = generatePassword();
    const user = await UserModel.create({
      name: name.trim(),
      email,
      password,
      plainPassword: password,
      role: "student",
      studentId,
    });

    res.status(201).json({ _id: user._id, name: user.name, email: user.email, password });
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
