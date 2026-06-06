import mongoose from "mongoose";
import dotenv from "dotenv";
import LessonProgressModel from "./models/lessonProgressModel";
import StudentModel from "./models/studentModel";
import LectureModel from "./models/lectureModel";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/route-academy";

async function seedProgress() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Get first student
    const student = await StudentModel.findOne();
    if (!student) {
      console.log("No student found. Please create a student first.");
      process.exit(1);
    }

    // Get lectures for student's academic year
    const lectures = await LectureModel.find({ academicYear: student.academicYear });
    if (lectures.length === 0) {
      console.log("No lectures found for student's academic year:", student.academicYear);
      process.exit(1);
    }

    console.log(`Found student: ${student.name}`);
    console.log(`Found ${lectures.length} lectures`);

    // Clear existing progress for this student
    await LessonProgressModel.deleteMany({ studentId: student._id });
    console.log("Cleared existing progress");

    // Seed progress data
    const progressData: any[] = [];
    const now = new Date();
    
    lectures.forEach((lecture: any, index: number) => {
      // Simulate different progress states
      let progressPercent = 0;
      let completed = false;
      let lastTime = 0;

      if (index < 2) {
        // First 2 lessons: completed
        progressPercent = 100;
        completed = true;
        lastTime = 0;
      } else if (index === 2) {
        // 3rd lesson: in progress at 60%
        progressPercent = 60;
        lastTime = 432; // 7:12 minutes
        completed = false;
      } else if (index === 3) {
        // 4th lesson: in progress at 30%
        progressPercent = 30;
        lastTime = 216; // 3:36 minutes
        completed = false;
      }
      // Rest are not started (0%)

      progressData.push({
        studentId: student._id,
        lectureId: lecture._id,
        progressPercent,
        lastTime,
        completed,
        updatedAt: new Date(now.getTime() - (lectures.length - index) * 60000), // Stagger update times
      });
    });

    await LessonProgressModel.insertMany(progressData);
    console.log(`Seeded ${progressData.length} progress records`);

    // Show summary
    const overall = {
      total: lectures.length,
      completed: progressData.filter(p => p.completed).length,
      inProgress: progressData.filter(p => p.progressPercent > 0 && !p.completed).length,
      notStarted: progressData.filter(p => p.progressPercent === 0).length,
    };

    console.log("\nProgress Summary:");
    console.log(`Total lessons: ${overall.total}`);
    console.log(`Completed: ${overall.completed}`);
    console.log(`In progress: ${overall.inProgress}`);
    console.log(`Not started: ${overall.notStarted}`);

    console.log("\nDone! You can now test the dashboard.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding progress:", error);
    process.exit(1);
  }
}

seedProgress();
