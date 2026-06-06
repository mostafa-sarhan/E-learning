import { Request, Response } from "express";
import LessonProgressModel from "../models/lessonProgressModel";
import LectureModel from "../models/lectureModel";
import StudentModel from "../models/studentModel";

// Get progress for a specific student
export const getStudentProgress = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const progress = await LessonProgressModel.find({ studentId }).populate("lectureId", "title section vimeoId");
    res.json(progress);
  } catch (error) {
    console.error("Error fetching student progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get progress for a specific lesson by student
export const getLessonProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, lectureId } = req.params;
    const progress = await LessonProgressModel.findOne({ studentId, lectureId });
    
    if (!progress) {
      return res.json({ progressPercent: 0, lastTime: 0, completed: false });
    }
    
    res.json(progress);
  } catch (error) {
    console.error("Error fetching lesson progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update progress for a lesson
export const updateLessonProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, lectureId } = req.params;
    const { progressPercent, lastTime, completed } = req.body;

    const updateData: any = {};
    if (progressPercent !== undefined) updateData.progressPercent = progressPercent;
    if (lastTime !== undefined) updateData.lastTime = lastTime;
    if (completed !== undefined) updateData.completed = completed;

    const progress = await LessonProgressModel.findOneAndUpdate(
      { studentId, lectureId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json(progress);
  } catch (error) {
    console.error("Error updating lesson progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all lecture progress for a student (for dashboard)
export const getStudentDashboardProgress = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    // Get all progress records for the student
    const progressRecords = await LessonProgressModel.find({ studentId });
    
    // Get all lectures for the student's academic year
    const student: any = await StudentModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const lectures = await LectureModel.find({ academicYear: student.academicYear });
    
    // Build progress map - only include lectures from current academic year
    const lectureIds = lectures.map((l: any) => l._id.toString());
    const progressMap: any = {};
    progressRecords.forEach((record: any) => {
      if (lectureIds.includes(record.lectureId.toString())) {
        progressMap[record.lectureId.toString()] = {
          progressPercent: record.progressPercent,
          lastTime: record.lastTime,
          completed: record.completed,
          updatedAt: record.updatedAt,
        };
      }
    });

    // Calculate overall stats - only count progress for current academic year lectures
    const relevantProgress = progressRecords.filter((r: any) => lectureIds.includes(r.lectureId.toString()));
    const totalLessons = lectures.length;
    const completedLessons = relevantProgress.filter((r: any) => r.completed).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Find last accessed lesson
    const lastAccessed = progressRecords
      .filter((r: any) => r.lastTime > 0 || r.progressPercent > 0)
      .sort((a: any, b: any) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      })[0];

    let lastAccessedLesson = null;
    if (lastAccessed) {
      const lecture = lectures.find((l: any) => l._id.toString() === lastAccessed.lectureId.toString());
      if (lecture) {
        lastAccessedLesson = {
          _id: lecture._id,
          title: lecture.title,
          section: lecture.section,
          vimeoId: lecture.vimeoId,
          progress: {
            progressPercent: lastAccessed.progressPercent,
            lastTime: lastAccessed.lastTime,
          }
        };
      }
    }

    res.json({
      overall: {
        totalLessons,
        completedLessons,
        progressPercent,
      },
      progressMap,
      lastAccessedLesson,
    });
  } catch (error) {
    console.error("Error fetching dashboard progress:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get overall progress stats for dashboard
export const getOverallProgressStats = async (_req: Request, res: Response) => {
  try {
    const allProgress = await LessonProgressModel.find();
    
    const notStarted = allProgress.filter(p => p.progressPercent === 0).length;
    const inProgress = allProgress.filter(p => p.progressPercent > 0 && p.progressPercent < 100).length;
    const completed = allProgress.filter(p => p.progressPercent >= 100 || p.completed).length;
    
    const avgProgress = allProgress.length > 0
      ? Math.round(allProgress.reduce((sum, p) => sum + p.progressPercent, 0) / allProgress.length)
      : 0;

    // Get progress data grouped by lecture
    const lectureIds = [...new Set(allProgress.map(p => p.lectureId.toString()))];
    const lectures = await LectureModel.find({ _id: { $in: lectureIds } }).select("_id title section academicYear");
    
    // Group progress by lecture section
    const sectionStats: { [key: string]: { total: number; completed: number; inProgress: number; avgPercent: number } } = {};
    
    for (const lecture of lectures) {
      const section = lecture.section || "بدون وحدة";
      if (!sectionStats[section]) {
        sectionStats[section] = { total: 0, completed: 0, inProgress: 0, avgPercent: 0 };
      }
      
      const lectureProgress = allProgress.filter(p => p.lectureId.toString() === lecture._id.toString());
      const lectureCompleted = lectureProgress.filter(p => p.completed || p.progressPercent >= 100).length;
      const lectureInProgress = lectureProgress.filter(p => p.progressPercent > 0 && p.progressPercent < 100).length;
      const lectureAvg = lectureProgress.length > 0
        ? Math.round(lectureProgress.reduce((sum, p) => sum + p.progressPercent, 0) / lectureProgress.length)
        : 0;
      
      sectionStats[section].total += lectureProgress.length;
      sectionStats[section].completed += lectureCompleted;
      sectionStats[section].inProgress += lectureInProgress;
      sectionStats[section].avgPercent = Math.max(sectionStats[section].avgPercent, lectureAvg);
    }

    const sectionData = Object.keys(sectionStats).slice(0, 8).map(section => ({
      section: section,
      completed: sectionStats[section].completed,
      inProgress: sectionStats[section].inProgress,
      avgProgress: sectionStats[section].avgPercent,
    }));

    res.json({
      notStarted,
      inProgress,
      completed,
      avgProgress,
      totalRecords: allProgress.length,
      sectionData,
    });
  } catch (error) {
    console.error("Error fetching overall progress stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
