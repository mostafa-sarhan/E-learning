import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import UserModel from "../models/userModel";
import StudentModel from "../models/studentModel";
import GroupModel from "../models/groupModel";
import { randomInt } from "crypto";
import { signToken } from "../middleware/auth";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      res.status(400).json({ message: "البريد الإلكتروني وكلمة المرور مطلوبين." });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).select("+password");
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

    const token = signToken({
      id: String(user._id),
      role: user.role,
      studentId: user.studentId ? String(user.studentId) : undefined,
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      student: studentData,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role } = req.body ?? {};
    if (!name || !email || !password || !role) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !["admin", "employee", "student"].includes(role)) {
      res.status(400).json({ message: "Invalid user data." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters." });
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

export async function getUserRole(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id).select("role");
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.json({ role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getUsersByRoles(req: Request, res: Response): Promise<void> {
  try {
    const users = await UserModel.find().select("name email role").sort({ role: 1, name: 1 });
    const grouped = {
      admin: users.filter(u => u.role === "admin").map(u => ({ _id: u._id, name: u.name, email: u.email, role: u.role })),
      employee: users.filter(u => u.role === "employee").map(u => ({ _id: u._id, name: u.name, email: u.email, role: u.role })),
      student: users.filter(u => u.role === "student").map(u => ({ _id: u._id, name: u.name, email: u.email, role: u.role })),
    };
    res.json({
      counts: {
        admin: grouped.admin.length,
        employee: grouped.employee.length,
        student: grouped.student.length,
        total: users.length,
      },
      users: grouped,
    });
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
    const { studentId, name } = req.body ?? {};
    if (!studentId || !name) {
      res.status(400).json({ message: "studentId and name are required." });
      return;
    }
    if (typeof name !== "string" || !isValidObjectId(studentId)) {
      res.status(400).json({ message: "Invalid studentId or name." });
      return;
    }

    // A student already linked to an account: never re-issue or reveal credentials here.
    const linked = await UserModel.findOne({ studentId });
    if (linked) {
      res.json({ _id: linked._id, name: linked.name, email: linked.email, password: null });
      return;
    }

    const base = transliterateName(name) || "student";
    let email = `${base}@route-academy.com`;
    for (let i = 2; await UserModel.exists({ email }); i++) {
      email = `${base}${i}@route-academy.com`;
    }

    // Shown to staff exactly once; only the bcrypt hash is stored.
    const password = generatePassword();
    const user = await UserModel.create({
      name: name.trim(),
      email,
      password,
      role: "student",
      studentId,
    });

    res.status(201).json({ _id: user._id, name: user.name, email: user.email, password });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function resetStudentPassword(req: Request, res: Response): Promise<void> {
  try {
    const user = await UserModel.findOne({ _id: req.params.id, role: "student" });
    if (!user) {
      res.status(404).json({ message: "Student account not found." });
      return;
    }
    const password = generatePassword();
    user.password = password;
    await user.save();
    // One-time display: the plaintext is never stored or returned again.
    res.json({ _id: user._id, email: user.email, password });
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
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(randomInt(chars.length));
  }
  return password;
}
