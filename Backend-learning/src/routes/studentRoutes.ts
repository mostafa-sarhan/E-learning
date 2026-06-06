import express from "express";
import {
  createStudent,
  deleteStudent,
  getStudentById,
  getStudents,
  updateStudent,
  updateStudentStatus,
  studentLogin,
  getAvailableExamsForStudent,
} from "../controllers/studentController";

const router = express.Router();

router.get("/", getStudents);
router.get("/:id", getStudentById);
router.post("/", createStudent);
router.post("/login", studentLogin);
router.get("/:studentId/exams", getAvailableExamsForStudent);
router.put("/:id", updateStudent);
router.patch("/:id/status", updateStudentStatus);
router.delete("/:id", deleteStudent);

export default router;
