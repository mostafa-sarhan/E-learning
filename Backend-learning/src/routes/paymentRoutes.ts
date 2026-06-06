import express from "express";
import { getPaymentsByStudent, createPayment, deletePayment, getAllPayments } from "../controllers/paymentController";

const router = express.Router();

router.get("/", getAllPayments);
router.get("/student/:studentId", getPaymentsByStudent);
router.post("/", createPayment);
router.delete("/:id", deletePayment);

export default router;
