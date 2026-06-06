import { Schema, model } from "mongoose";

const attendanceRecordSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    status: { type: String, enum: ["present", "absent"], required: true },
    time: { type: Date, default: Date.now },
  },
  { _id: false } // No need for a separate ID for each record sub-document
);

const attendanceSchema = new Schema(
  {
    date: { type: Date, required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    records: [attendanceRecordSchema],
  },
  { timestamps: true }
);

// Ensure there is only one attendance record per group per day
attendanceSchema.index({ date: 1, group: 1 }, { unique: true });

const AttendanceModel = model("Attendance", attendanceSchema);

export default AttendanceModel;
