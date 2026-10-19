import express from "express";
import { getPaymentsByStudent, createPayment, deletePayment, getAllPayments } from "../controllers/paymentController";
import { guardObjectIdParams } from "../middleware/auth";

const router = express.Router();
guardObjectIdParams(router);

router.get("/", getAllPayments);
router.get("/student/:studentId", getPaymentsByStudent);
router.post("/", createPayment);
router.delete("/:id", deletePayment);

export default router;
