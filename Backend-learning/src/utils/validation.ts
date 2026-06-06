import { ACADEMIC_GRADE_SET } from "../constants/academicGrades";
import { Course, Student, Group } from "../types/models";

function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 22) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function parseBirthday(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value.trim());
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function validateStudentPayload(payload: Partial<Student>): string | null {
  const { name, phone, fatherPhone, academicYear, birthday, status } = payload;

  if (!name || typeof name !== "string" || !name.trim()) {
    return "Name is required and must be a string.";
  }

  if (!phone || typeof phone !== "string" || !isValidPhone(phone)) {
    return "A valid phone number is required.";
  }

  if (!fatherPhone || typeof fatherPhone !== "string" || !isValidPhone(fatherPhone)) {
    return "A valid father phone number is required.";
  }

  if (
    !academicYear ||
    typeof academicYear !== "string" ||
    !ACADEMIC_GRADE_SET.has(academicYear.trim())
  ) {
    return "Academic year must be one of: الصف الاول، الصف الثانى، الصف الثالث.";
  }

  const birthDate = parseBirthday(birthday);
  if (!birthDate) {
    return "A valid birthday (date) is required.";
  }

  const now = new Date();
  if (birthDate > now) {
    return "Birthday cannot be in the future.";
  }

  if (status !== "active" && status !== "inactive") {
    return 'Status must be "active" or "inactive".';
  }

  // group is optional, but if provided it should be a string (ObjectId)
  if (payload.group !== undefined && typeof payload.group !== "string") {
    return "Group ID must be a string.";
  }

  return null;
}

export function validateCoursePayload(payload: Partial<Course>): string | null {
  const { title, code, creditHours } = payload;

  if (!title || typeof title !== "string") {
    return "Title is required and must be a string.";
  }

  if (!code || typeof code !== "string") {
    return "Course code is required and must be a string.";
  }

  if (typeof creditHours !== "number" || creditHours < 1 || creditHours > 6) {
    return "Credit hours must be a number between 1 and 6.";
  }

  return null;
}

export function validateGroupPayload(payload: Partial<Group>): string | null {
  const { name, academicYear, days, time } = payload;

  if (!name || typeof name !== "string" || !name.trim()) {
    return "Name is required and must be a string.";
  }

  if (
    !academicYear ||
    typeof academicYear !== "string" ||
    !ACADEMIC_GRADE_SET.has(academicYear.trim())
  ) {
    return "Academic year must be one of: الصف الاول، الصف الثانى، الصف الثالث.";
  }

  if (!Array.isArray(days) || days.length === 0 || !days.every(d => typeof d === "string")) {
    return "Days must be a non-empty array of strings.";
  }

  if (!time || typeof time !== "string" || !time.trim()) {
    return "Time is required and must be a string.";
  }

  return null;
}
