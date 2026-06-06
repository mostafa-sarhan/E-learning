import express from "express";
import {
  getLectures,
  getLecturesByYear,
  createLecture,
  updateLecture,
  deleteLecture,
} from "../controllers/lectureController";

const router = express.Router();

router.get("/", getLectures);
router.get("/year/:year", getLecturesByYear);
router.post("/", createLecture);
router.put("/:id", updateLecture);
router.delete("/:id", deleteLecture);

export default router;
