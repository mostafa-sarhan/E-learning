import express from "express";
import { getExams, createExam, deleteExam, getExamById, toggleResults, sendResultsWhatsApp } from "../controllers/examController";
import {
  getQuestionsByExam,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitExam,
  getSubmissionByStudent,
  getExamResults,
} from "../controllers/questionController";
import { guardObjectIdParams, requireSelfOrStaff, requireStaff } from "../middleware/auth";
import { whatsappLimiter } from "../middleware/security";

const router = express.Router();
guardObjectIdParams(router);

router.get("/", requireStaff, getExams);
router.post("/", requireStaff, createExam);
router.patch("/:id/toggle-results", requireStaff, toggleResults);
router.post("/:id/send-results-whatsapp", requireStaff, whatsappLimiter, sendResultsWhatsApp);
router.get("/:id", requireStaff, getExamById);
router.delete("/:id", requireStaff, deleteExam);

router.get("/:examId/questions", getQuestionsByExam);
router.post("/:examId/questions", requireStaff, createQuestion);
router.put("/questions/:id", requireStaff, updateQuestion);
router.delete("/questions/:id", requireStaff, deleteQuestion);

router.post("/:examId/submit", requireSelfOrStaff(), submitExam);
router.get("/:examId/results/:studentId", requireSelfOrStaff(), getSubmissionByStudent);
router.get("/:examId/results", requireStaff, getExamResults);

export default router;
