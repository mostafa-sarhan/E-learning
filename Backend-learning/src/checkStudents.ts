import mongoose from "mongoose";
import StudentModel from "./models/studentModel";
import UserModel from "./models/userModel";

async function check() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/students");
  
  const students = await StudentModel.find();
  console.log("Total students:", students.length);
  students.forEach(s => console.log("-", s.name, "| group:", s.group, "| academicYear:", s.academicYear));
  
  const studentUsers = await UserModel.find({ role: "student" }).populate({
    path: "studentId",
    select: "name phone academicYear group",
    populate: { path: "group", select: "name" },
  });
  console.log("\nTotal student accounts:", studentUsers.length);
  studentUsers.forEach(u => {
    const s = u.studentId as any;
    console.log("-", u.name, "| email:", u.email, "| password:", u.plainPassword, "| group:", s?.group?.name || "NO GROUP", "| year:", s?.academicYear);
  });
  
  await mongoose.disconnect();
}

check();
