import type { AcademicGrade } from "../constants/academicGrades";

export type StudentStatus = "active" | "inactive";

export interface Student {
  id: string;
  name: string;
  phone: string;
  fatherPhone: string;
  academicYear: AcademicGrade;
  birthday: Date | string;
  status: StudentStatus;
  group?: string; // Optional group ID
}

export interface Course {
  id: string;
  title: string;
  code: string;
  creditHours: number;
}

export interface Enrollment {
  studentId: string;
  courseId: string;
  enrolledAt: string;
}

export interface Group {
  id: string;
  name: string;
  academicYear: AcademicGrade;
  days: string[];
  time: string;
}
