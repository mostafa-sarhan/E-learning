import { Schema, model } from "mongoose";
import { ACADEMIC_GRADES } from "../constants/academicGrades";

const studentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    fatherPhone: { type: String, required: true, trim: true },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      enum: [...ACADEMIC_GRADES],
    },
    birthday: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive"],
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
    },
  },
  { timestamps: true }
);

const StudentModel = model("Student", studentSchema);

export default StudentModel;
