import express from "express";
import {
  createStudent,
  deleteStudent,
  getStudentById,
  getStudents,
  updateStudent,
  updateStudentStatus,
  getAvailableExamsForStudent,
} from "../controllers/studentController";
import { guardObjectIdParams, requireSelfOrStaff, requireStaff } from "../middleware/auth";

const router = express.Router();
guardObjectIdParams(router);

router.get("/", requireStaff, getStudents);
router.get("/:id", requireStaff, getStudentById);
router.post("/", requireStaff, createStudent);
router.get("/:studentId/exams", requireSelfOrStaff(), getAvailableExamsForStudent);
router.put("/:id", requireStaff, updateStudent);
router.patch("/:id/status", requireStaff, updateStudentStatus);
router.delete("/:id", requireStaff, deleteStudent);

export default router;
