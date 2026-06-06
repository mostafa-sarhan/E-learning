import { Schema, model } from "mongoose";
import { ACADEMIC_GRADES } from "../constants/academicGrades";

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      enum: [...ACADEMIC_GRADES],
    },
    days: {
      type: [String],
      required: true,
      validate: [
        (val: string[]) => val.length > 0,
        "A group must have at least one day.",
      ],
    },
    time: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const GroupModel = model("Group", groupSchema);

export default GroupModel;
