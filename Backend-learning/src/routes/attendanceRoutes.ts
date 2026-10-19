import express from "express";
import { getAttendance, getStudentsByGroup, getAttendanceByStudent, markStudentAttendance, sendAttendanceWhatsApp, getWeeklyAttendanceStats } from "../controllers/attendanceController";
import { guardObjectIdParams } from "../middleware/auth";
import { whatsappLimiter } from "../middleware/security";

const router = express.Router();
guardObjectIdParams(router);

router.get("/stats", getWeeklyAttendanceStats);
router.get("/", getAttendance);
router.put("/mark", markStudentAttendance);
router.post("/send-whatsapp", whatsappLimiter, sendAttendanceWhatsApp);
router.get("/students/:groupId", getStudentsByGroup);
router.get("/student/:studentId", getAttendanceByStudent);

export default router;
