import { Schema, model } from "mongoose";

const questionSchema = new Schema(
  {
    exam: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    text: { type: String, required: true },
    type: { type: String, enum: ["mcq", "truefalse"], required: true },
    options: [{ type: String }], // For MCQ
    correctAnswer: { type: String, required: true }, // For MCQ: the option text, For TrueFalse: "true" or "false"
    points: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const QuestionModel = model("Question", questionSchema);

export default QuestionModel;
