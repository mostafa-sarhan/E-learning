import { Request, Response } from "express";
import AttendanceModel from "../models/attendanceModel";
import StudentModel from "../models/studentModel";
import { sendWhatsAppMessage, isWhatsAppReady } from "../utils/whatsapp";

// Helper to parse date to a start of day in UTC to avoid timezone issues
function parseDateString(dateString: string) {
  const d = new Date(dateString);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  try {
    const { groupId, date } = req.query;

    if (!groupId || !date || typeof groupId !== "string" || typeof date !== "string") {
      res.status(400).json({ message: "groupId and date are required." });
      return;
    }

    const parsedDate = parseDateString(date);

    const attendance = await AttendanceModel.findOne({
      group: groupId,
      date: parsedDate,
    }).populate("records.student");

    if (!attendance) {
      // If no attendance recorded yet, we return an empty records array
      res.json({ date: parsedDate, group: groupId, records: [] });
      return;
    }

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function markStudentAttendance(req: Request, res: Response): Promise<void> {
  try {
    const { groupId, date, studentId, status } = req.body;

    if (!groupId || !date || !studentId || !status) {
      res.status(400).json({ message: "groupId, date, studentId, and status are required." });
      return;
    }

    const parsedDate = parseDateString(date);

    // Find or create the attendance document for this group and date
    let attendance = await AttendanceModel.findOne({ group: groupId, date: parsedDate });
    
    if (!attendance) {
      attendance = new AttendanceModel({
        group: groupId,
        date: parsedDate,
        records: [],
      });
    }

    // Check if student already has a record
    const recordIndex = attendance.records.findIndex(r => r.student.toString() === studentId);

    if (recordIndex > -1) {
      // Update existing record
      attendance.records[recordIndex].status = status;
      attendance.records[recordIndex].time = new Date();
    } else {
      // Add new record
      attendance.records.push({ student: studentId, status, time: new Date() });
    }

    await attendance.save();
    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}


export async function getStudentsByGroup(req: Request, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const students = await StudentModel.find({ group: groupId }).sort({ name: 1 });
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getAttendanceByStudent(req: Request, res: Response): Promise<void> {
  try {
    const { studentId } = req.params;
    const attendances = await AttendanceModel.find({ "records.student": studentId }).sort({ date: -1 });
    
    const history = attendances.map(att => {
      const record = att.records.find(r => r.student.toString() === studentId);
      return {
        date: att.date,
        status: record ? record.status : "unknown",
        time: record ? record.time : null,
      };
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getWeeklyAttendanceStats(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const attendanceRecords = await AttendanceModel.find({
      date: { $gte: sevenDaysAgo },
    });

    const dailyStats: { [key: string]: { present: number; absent: number } } = {};

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      dailyStats[dateStr] = { present: 0, absent: 0 };
    }

    for (const att of attendanceRecords) {
      const dateStr = new Date(att.date).toISOString().split("T")[0];
      if (dailyStats[dateStr] !== undefined) {
        for (const record of att.records) {
          if (record.status === "present") {
            dailyStats[dateStr].present++;
          } else if (record.status === "absent") {
            dailyStats[dateStr].absent++;
          }
        }
      }
    }

    const result = Object.keys(dailyStats).map(dateStr => {
      const d = new Date(dateStr + "T00:00:00");
      return {
        day: d.toLocaleDateString("ar-EG", { weekday: "short" }),
        date: dateStr,
        ...dailyStats[dateStr],
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function sendAttendanceWhatsApp(req: Request, res: Response): Promise<void> {
  try {
    const { groupId, date } = req.body;

    if (!groupId || !date) {
      res.status(400).json({ message: "groupId and date are required." });
      return;
    }

    if (!isWhatsAppReady()) {
      res.status(503).json({ message: "WhatsApp is not connected. Please scan QR code first." });
      return;
    }

    const parsedDate = parseDateString(date);
    const attendance = await AttendanceModel.findOne({ group: groupId, date: parsedDate }).populate("records.student");

    if (!attendance || attendance.records.length === 0) {
      res.status(404).json({ message: "No attendance records found for this group and date." });
      return;
    }

    const results: { studentName: string; status: string; success: boolean; phone?: string }[] = [];

    for (const record of attendance.records) {
      const student = record.student as any;
      if (!student || !student.fatherPhone) {
        results.push({ studentName: student?.name || "Unknown", status: record.status, success: false });
        continue;
      }

      const phone = student.fatherPhone.replace(/[^0-9]/g, "");
      const cleanPhone = phone.startsWith("0") ? phone.slice(1) : phone;
      const finalPhone = cleanPhone.startsWith("20") ? cleanPhone : `20${cleanPhone}`;

      const attendanceDate = attendance.date.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "numeric", day: "numeric" });
      const time = record.time ? new Date(record.time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "";

      let message: string;
      if (record.status === "present") {
        message = `السلام عليكم
نحيط سيادتكم علما بأن الطالب / ${student.name}
قد حضر بالفعل إلى الدرس يوم ${attendanceDate}
في تمام الساعة ${time}
مع أمانينا له بالنجاح والتفوق
****أكاديمية التعليم****`;
      } else {
        message = `السلام عليكم
نحيط سيادتكم علما بأن الطالب / ${student.name}
لم يحضر إلى الدرس يوم ${attendanceDate}
وهذا للعلم منّا
ولسيادتكم جزيل الشكر
****أكاديمية التعليم****`;
      }

      const success = await sendWhatsAppMessage(finalPhone, message, {
        studentName: student.name,
        messageType: record.status === "present" ? "attendance" : "absence",
      });
      results.push({ studentName: student.name, status: record.status, success, phone: finalPhone });
    }

    const sentCount = results.filter(r => r.success).length;
    res.json({ message: `تم إرسال ${sentCount}/${results.length} رسالة`, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}
