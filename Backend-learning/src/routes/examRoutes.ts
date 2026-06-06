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

const router = express.Router();

router.get("/", getExams);
router.post("/", createExam);
router.patch("/:id/toggle-results", toggleResults);
router.post("/:id/send-results-whatsapp", sendResultsWhatsApp);
router.get("/:id", getExamById);
router.delete("/:id", deleteExam);

router.get("/:examId/questions", getQuestionsByExam);
router.post("/:examId/questions", createQuestion);
router.put("/questions/:id", updateQuestion);
router.delete("/questions/:id", deleteQuestion);

router.post("/:examId/submit", submitExam);
router.get("/:examId/results/:studentId", getSubmissionByStudent);
router.get("/:examId/results", getExamResults);

export default router;
