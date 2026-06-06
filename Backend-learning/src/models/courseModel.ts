import { Schema, model } from "mongoose";

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    creditHours: { type: Number, required: true, min: 1, max: 6 },
  },
  { timestamps: true }
);

const CourseModel = model("Course", courseSchema);

export default CourseModel;
