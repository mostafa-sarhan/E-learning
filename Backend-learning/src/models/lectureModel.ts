import { Schema, model } from "mongoose";
import { ACADEMIC_GRADES } from "../constants/academicGrades";

const lectureSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      enum: [...ACADEMIC_GRADES],
    },
    section: { type: String, default: "", trim: true },
    vimeoId: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const LectureModel = model("Lecture", lectureSchema);

export default LectureModel;
