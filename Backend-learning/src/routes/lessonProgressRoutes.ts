import { Router } from "express";
import {
  getStudentProgress,
  getLessonProgress,
  updateLessonProgress,
  getStudentDashboardProgress,
  getOverallProgressStats,
} from "../controllers/lessonProgressController";
import { guardObjectIdParams, requireSelfOrStaff, requireStaff } from "../middleware/auth";

const router = Router();
guardObjectIdParams(router);

// Get overall progress stats
router.get("/stats", requireStaff, getOverallProgressStats);

// Get all progress for a student
router.get("/student/:studentId", requireSelfOrStaff(), getStudentProgress);

// Get progress for a specific lesson
router.get("/student/:studentId/lecture/:lectureId", requireSelfOrStaff(), getLessonProgress);

// Update progress for a lesson
router.put("/student/:studentId/lecture/:lectureId", requireSelfOrStaff(), updateLessonProgress);

// Get dashboard progress data (includes stats + last accessed)
router.get("/dashboard/:studentId", requireSelfOrStaff(), getStudentDashboardProgress);

export default router;
