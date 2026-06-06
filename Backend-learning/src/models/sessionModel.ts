import { Schema, model } from "mongoose";

const sessionSchema = new Schema(
  {
    dayIndex: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    subject: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const SessionModel = model("Session", sessionSchema);

export default SessionModel;
