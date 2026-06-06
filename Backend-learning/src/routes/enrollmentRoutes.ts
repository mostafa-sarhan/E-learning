import express from "express";
import {
  enrollStudent,
  getEnrollments,
  removeEnrollment,
} from "../controllers/enrollmentController";

const router = express.Router();

router.get("/", getEnrollments);
router.post("/", enrollStudent);
router.delete("/:studentId/:courseId", removeEnrollment);

export default router;
