import { Request, Response } from "express";
import type { AcademicGrade } from "../constants/academicGrades";
import { Group } from "../types/models";
import { validateGroupPayload } from "../utils/validation";
import GroupModel from "../models/groupModel";

import StudentModel from "../models/studentModel";

function sanitizeGroupBody(body: unknown): Partial<Group> {
  if (!body || typeof body !== "object") {
    return {};
  }
  const b = body as Record<string, unknown>;
  const academicYear = b.academicYear;
  return {
    name: typeof b.name === "string" ? b.name : undefined,
    academicYear:
      typeof academicYear === "string" ? (academicYear as AcademicGrade) : undefined,
    days: Array.isArray(b.days) ? b.days : undefined,
    time: typeof b.time === "string" ? b.time : undefined,
  };
}

export async function getGroups(req: Request, res: Response): Promise<void> {
  const groups = await GroupModel.find().lean().sort({ createdAt: -1 });
  
  // Calculate students count for each group
  const groupsWithCount = await Promise.all(
    groups.map(async (group) => {
      const count = await StudentModel.countDocuments({ group: group._id });
      return { ...group, studentsCount: count };
    })
  );

  res.json(groupsWithCount);
}

export async function getGroupById(req: Request, res: Response): Promise<void> {
  const group = await GroupModel.findById(req.params.id);

  if (!group) {
    res.status(404).json({ message: "Group not found." });
    return;
  }

  res.json(group);
}

export async function createGroup(
  req: Request<unknown, unknown, Partial<Group>>,
  res: Response
): Promise<void> {
  const payload = sanitizeGroupBody(req.body);
  const error = validateGroupPayload(payload);

  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const newGroup = await GroupModel.create({
    name: payload.name!.trim(),
    academicYear: payload.academicYear!.trim(),
    days: payload.days!.map(d => d.trim()),
    time: payload.time!.trim(),
  });
  
  res.status(201).json(newGroup);
}

export async function updateGroup(
  req: Request<{ id: string }, unknown, Partial<Group>>,
  res: Response
): Promise<void> {
  const existingGroup = await GroupModel.findById(req.params.id);
  if (!existingGroup) {
    res.status(404).json({ message: "Group not found." });
    return;
  }

  const payload = sanitizeGroupBody(req.body);
  const error = validateGroupPayload(payload);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const updatedGroup = await GroupModel.findByIdAndUpdate(
    req.params.id,
    {
      name: payload.name!.trim(),
      academicYear: payload.academicYear!.trim(),
      days: payload.days!.map(d => d.trim()),
      time: payload.time!.trim(),
    },
    { new: true }
  );

  res.json(updatedGroup);
}

export async function deleteGroup(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const deletedGroup = await GroupModel.findByIdAndDelete(req.params.id);
  if (!deletedGroup) {
    res.status(404).json({ message: "Group not found." });
    return;
  }

  res.status(204).send();
}
