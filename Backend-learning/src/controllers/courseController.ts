import { Request, Response } from "express";
import { Course } from "../types/models";
import { validateCoursePayload } from "../utils/validation";
import CourseModel from "../models/courseModel";

export async function getCourses(req: Request, res: Response): Promise<void> {
  const courses = await CourseModel.find().sort({ createdAt: -1 });
  res.json(courses);
}

export async function getCourseById(req: Request, res: Response): Promise<void> {
  const course = await CourseModel.findById(req.params.id);

  if (!course) {
    res.status(404).json({ message: "Course not found." });
    return;
  }

  res.json(course);
}

export async function createCourse(
  req: Request<unknown, unknown, Partial<Course>>,
  res: Response
): Promise<void> {
  const error = validateCoursePayload(req.body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const codeExists = await CourseModel.findOne({ code: req.body.code });
  if (codeExists) {
    res.status(409).json({ message: "Course code already exists." });
    return;
  }

  const newCourse = await CourseModel.create({
    title: req.body.title!,
    code: req.body.code!,
    creditHours: req.body.creditHours!,
  });
  res.status(201).json(newCourse);
}

export async function updateCourse(
  req: Request<{ id: string }, unknown, Partial<Course>>,
  res: Response
): Promise<void> {
  const existingCourse = await CourseModel.findById(req.params.id);
  if (!existingCourse) {
    res.status(404).json({ message: "Course not found." });
    return;
  }

  const error = validateCoursePayload(req.body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const duplicateCode = await CourseModel.findOne({
    code: req.body.code,
    _id: { $ne: req.params.id },
  });

  if (duplicateCode) {
    res.status(409).json({ message: "Course code already exists." });
    return;
  }

  const updatedCourse = await CourseModel.findByIdAndUpdate(
    req.params.id,
    { ...req.body },
    { new: true }
  );
  res.json(updatedCourse);
}

export async function deleteCourse(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const deletedCourse = await CourseModel.findByIdAndDelete(req.params.id);
  if (!deletedCourse) {
    res.status(404).json({ message: "Course not found." });
    return;
  }

  res.status(204).send();
}
