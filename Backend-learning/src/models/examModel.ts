import { Schema, model } from "mongoose";

const examSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // Format HH:mm
    durationMins: { type: Number, required: true },
    resultsPublished: { type: Boolean, default: false },
   },
   { timestamps: true }
 );

const ExamModel = model("Exam", examSchema);

export default ExamModel;
