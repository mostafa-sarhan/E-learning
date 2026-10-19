import express from "express";
import {
  enrollStudent,
  getEnrollments,
  removeEnrollment,
} from "../controllers/enrollmentController";
import { guardObjectIdParams } from "../middleware/auth";

const router = express.Router();
guardObjectIdParams(router);

router.get("/", getEnrollments);
router.post("/", enrollStudent);
router.delete("/:studentId/:courseId", removeEnrollment);

export default router;
