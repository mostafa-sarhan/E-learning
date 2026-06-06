import mongoose from "mongoose";
import StudentModel from "./models/studentModel";
import UserModel from "./models/userModel";

async function seedExistingStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/students");
    console.log("Connected to MongoDB");

    const studentsWithoutAccounts = await StudentModel.find({
      _id: { $nin: (await UserModel.find({ role: "student" }).distinct("studentId")) },
    });

    if (studentsWithoutAccounts.length === 0) {
      console.log("All students already have accounts.");
      await mongoose.disconnect();
      return;
    }

    const transliterateName = (name: string): string => {
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
    };

    const generatePassword = (): string => {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let password = "";
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    let created = 0;
    for (const student of studentsWithoutAccounts) {
      const transliterated = transliterateName(student.name);
      const email = transliterated + "@route-academy.com";

      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        console.log(`Account exists for ${student.name}: ${email}`);
        continue;
      }

      const password = generatePassword();
      await UserModel.create({
        name: student.name,
        email,
        password,
        plainPassword: password,
        role: "student",
        studentId: student._id as any,
      });

      console.log(`Created account for ${student.name} -> ${email} / ${password}`);
      created++;
    }

    console.log(`\nDone! Created ${created} new student account(s).`);
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedExistingStudents();
