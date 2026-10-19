import express from "express";
import {
  getLectures,
  getLecturesByYear,
  createLecture,
  updateLecture,
  deleteLecture,
} from "../controllers/lectureController";
import { guardObjectIdParams, requireStaff } from "../middleware/auth";

const router = express.Router();
guardObjectIdParams(router);

router.get("/", requireStaff, getLectures);
router.get("/year/:year", getLecturesByYear);
router.post("/", requireStaff, createLecture);
router.put("/:id", requireStaff, updateLecture);
router.delete("/:id", requireStaff, deleteLecture);

export default router;
