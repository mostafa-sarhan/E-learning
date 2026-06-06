import express from "express";
import { getAttendance, getStudentsByGroup, getAttendanceByStudent, markStudentAttendance, sendAttendanceWhatsApp, getWeeklyAttendanceStats } from "../controllers/attendanceController";

const router = express.Router();

router.get("/stats", getWeeklyAttendanceStats);
router.get("/", getAttendance);
router.put("/mark", markStudentAttendance);
router.post("/send-whatsapp", sendAttendanceWhatsApp);
router.get("/students/:groupId", getStudentsByGroup);
router.get("/student/:studentId", getAttendanceByStudent);

export default router;
