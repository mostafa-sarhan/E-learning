import { Router } from "express";
import {
  getStudentProgress,
  getLessonProgress,
  updateLessonProgress,
  getStudentDashboardProgress,
  getOverallProgressStats,
} from "../controllers/lessonProgressController";

const router = Router();

// Get overall progress stats
router.get("/stats", getOverallProgressStats);

// Get all progress for a student
router.get("/student/:studentId", getStudentProgress);

// Get progress for a specific lesson
router.get("/student/:studentId/lecture/:lectureId", getLessonProgress);

// Update progress for a lesson
router.put("/student/:studentId/lecture/:lectureId", updateLessonProgress);

// Get dashboard progress data (includes stats + last accessed)
router.get("/dashboard/:studentId", getStudentDashboardProgress);

export default router;
