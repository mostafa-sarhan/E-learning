import { Schema, model } from "mongoose";

const examSubmissionSchema = new Schema(
  {
    exam: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    answers: [
      {
        question: { type: Schema.Types.ObjectId, ref: "Question" },
        answer: { type: String, required: true },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    score: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ExamSubmissionModel = model("ExamSubmission", examSubmissionSchema);

export default ExamSubmissionModel;
