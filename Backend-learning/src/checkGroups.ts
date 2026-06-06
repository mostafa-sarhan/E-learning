import mongoose from "mongoose";
import StudentModel from "./models/studentModel";
import GroupModel from "./models/groupModel";

async function assignGroups() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/students");
  
  const groups = await GroupModel.find();
  console.log("Available groups:");
  groups.forEach(g => console.log("-", g.name, "| ID:", g._id.toString(), "| year:", (g as any).academicYear));
  
  const studentsWithoutGroup = await StudentModel.find({ group: null });
  console.log("\nStudents without group:", studentsWithoutGroup.length);
  studentsWithoutGroup.forEach(s => console.log("-", s.name, "| year:", s.academicYear));
  
  await mongoose.disconnect();
}

assignGroups();
