import { Request, Response } from "express";
import CourseModel from "../models/courseModel";
import EnrollmentModel from "../models/enrollmentModel";
import StudentModel from "../models/studentModel";

interface EnrollmentPayload {
  studentId?: string;
  courseId?: string;
}

export async function getEnrollments(req: Request, res: Response): Promise<void> {
  const enrollments = await EnrollmentModel.find()
    .populate(
      "studentId",
      "name phone fatherPhone academicYear birthday status"
    )
    .populate("courseId", "title code creditHours")
    .sort({ createdAt: -1 });

  res.json(enrollments);
}

export async function enrollStudent(
  req: Request<unknown, unknown, EnrollmentPayload>,
  res: Response
): Promise<void> {
  const { studentId, courseId } = req.body;

  if (!studentId || !courseId) {
    res.status(400).json({ message: "studentId and courseId are required." });
    return;
  }

  const studentExists = await StudentModel.exists({ _id: studentId });
  const courseExists = await CourseModel.exists({ _id: courseId });

  if (!studentExists) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  if (!courseExists) {
    res.status(404).json({ message: "Course not found." });
    return;
  }

  const alreadyEnrolled = await EnrollmentModel.findOne({ studentId, courseId });

  if (alreadyEnrolled) {
    res.status(409).json({ message: "Student already enrolled in this course." });
    return;
  }

  const enrollment = await EnrollmentModel.create({
    studentId,
    courseId,
    enrolledAt: new Date(),
  });
  res.status(201).json(enrollment);
}

export async function removeEnrollment(
  req: Request<{ studentId: string; courseId: string }>,
  res: Response
): Promise<void> {
  const { studentId, courseId } = req.params;

  const deleted = await EnrollmentModel.findOneAndDelete({ studentId, courseId });
  if (!deleted) {
    res.status(404).json({ message: "Enrollment not found." });
    return;
  }

  res.status(204).send();
}
