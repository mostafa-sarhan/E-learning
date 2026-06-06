/** الصفوف المسموح بها للسنة الدراسية */
export const ACADEMIC_GRADES = [
  "الصف الاول",
  "الصف الثانى",
  "الصف الثالث",
  "الصف الاول الثانوى",
  "الصف الثاني الثانوي",
  "الصف الثالث الثانوي",
] as const;

export type AcademicGrade = (typeof ACADEMIC_GRADES)[number];

export const ACADEMIC_GRADE_SET = new Set<string>(ACADEMIC_GRADES);
