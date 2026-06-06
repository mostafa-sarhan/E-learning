import { Schema, model } from "mongoose";

const paymentSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    amount: { type: Number, required: true, min: 0 },
    month: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PaymentModel = model("Payment", paymentSchema);

export default PaymentModel;
