import { Request, Response } from "express";
import SessionModel from "../models/sessionModel";

export const getSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await SessionModel.find().populate("group").sort({ dayIndex: 1, startTime: 1 });
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch sessions." });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { dayIndex, startTime, endTime, groupId, subject } = req.body;
    if (!dayIndex || !startTime || !endTime || !groupId || !subject) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const session = new SessionModel({ dayIndex, startTime, endTime, group: groupId, subject });
    await session.save();
    res.status(201).json(session);
  } catch (e) {
    res.status(500).json({ message: "Failed to create session." });
  }
};

export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dayIndex, startTime, endTime, groupId, subject } = req.body;
    const session = await SessionModel.findByIdAndUpdate(
      id,
      { dayIndex, startTime, endTime, group: groupId, subject },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: "Session not found." });
    res.json(session);
  } catch (e) {
    res.status(500).json({ message: "Failed to update session." });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await SessionModel.findByIdAndDelete(id);
    if (!session) return res.status(404).json({ message: "Session not found." });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ message: "Failed to delete session." });
  }
};
