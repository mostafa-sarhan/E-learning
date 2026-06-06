import { Schema, model } from "mongoose";

const lessonProgressSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    lectureId: {
      type: Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastTime: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure one progress record per student per lecture
lessonProgressSchema.index({ studentId: 1, lectureId: 1 }, { unique: true });

const LessonProgressModel = model("LessonProgress", lessonProgressSchema);

export default LessonProgressModel;
