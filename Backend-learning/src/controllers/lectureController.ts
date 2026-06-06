import { Request, Response } from "express";
import LectureModel from "../models/lectureModel";

export const getLectures = async (req: Request, res: Response) => {
  try {
    const lectures = await LectureModel.find().sort({ academicYear: 1, order: 1, createdAt: 1 });
    res.json(lectures);
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch lectures." });
  }
};

export const getLecturesByYear = async (req: Request, res: Response) => {
  try {
    const { year } = req.params;
    const lectures = await LectureModel.find({ academicYear: year }).sort({ order: 1, createdAt: 1 });
    res.json(lectures);
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch lectures." });
  }
};

export const createLecture = async (req: Request, res: Response) => {
  try {
    const { title, academicYear, vimeoId, description, order, section } = req.body;
    if (!title || !academicYear || !vimeoId) {
      return res.status(400).json({ message: "Title, academic year, and Vimeo ID are required." });
    }
    const lecture = new LectureModel({ title, academicYear, vimeoId, description, order: order ?? 0, section: section || "" });
    await lecture.save();
    res.status(201).json(lecture);
  } catch (e) {
    res.status(500).json({ message: "Failed to create lecture." });
  }
};

export const updateLecture = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, academicYear, vimeoId, description, order, section } = req.body;
    const lecture = await LectureModel.findByIdAndUpdate(
      id,
      { title, academicYear, vimeoId, description, order, section },
      { new: true }
    );
    if (!lecture) return res.status(404).json({ message: "Lecture not found." });
    res.json(lecture);
  } catch (e) {
    res.status(500).json({ message: "Failed to update lecture." });
  }
};

export const deleteLecture = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lecture = await LectureModel.findByIdAndDelete(id);
    if (!lecture) return res.status(404).json({ message: "Lecture not found." });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ message: "Failed to delete lecture." });
  }
};
