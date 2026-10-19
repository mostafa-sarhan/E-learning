// Deterministic, fictional demo data for the academy. Same batch + counts + anchor date
// always produce the same documents with the same _ids.
import crypto from "crypto";
import { Types } from "mongoose";
import { ACADEMIC_GRADES } from "../../constants/academicGrades";
import { demoId } from "./shared";

export interface Counts {
  students: number;
  staff: number;
  groups: number;
  lectures: number;
  exams: number;
  questionsPerExam: number;
  submissions: number;
  payments: number;
  expenses: number;
  progress: number;
  attendanceWeeks: number;
}

export const DEFAULT_COUNTS: Counts = {
  students: 200, staff: 15, groups: 20, lectures: 60, exams: 30, questionsPerExam: 15,
  submissions: 500, payments: 300, expenses: 50, progress: 600, attendanceWeeks: 4,
};

export const LIMITS: Counts = {
  students: 2000, staff: 100, groups: 120, lectures: 600, exams: 300, questionsPerExam: 40,
  submissions: 20000, payments: 20000, expenses: 1000, progress: 50000, attendanceWeeks: 26,
};

export function parseCounts(spec: string | boolean | undefined): Counts {
  const counts = { ...DEFAULT_COUNTS };
  if (typeof spec !== "string" || !spec) return counts;
  for (const part of spec.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (!(k in counts)) throw new Error(`Unknown count "${k}". Allowed: ${Object.keys(counts).join(", ")}`);
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > (LIMITS as any)[k]) throw new Error(`Count ${k} must be 0..${(LIMITS as any)[k]}.`);
    (counts as any)[k] = n;
  }
  if (counts.groups === 0 && counts.students > 0) throw new Error("students require at least one group.");
  return counts;
}

/** Kinds in insertion order (parents first). Cleanup uses the reverse order. */
export const KINDS = [
  { kind: "group", collection: "groups" },
  { kind: "student", collection: "students" },
  { kind: "staff", collection: "users" },
  { kind: "account", collection: "users" },
  { kind: "session", collection: "sessions" },
  { kind: "lecture", collection: "lectures" },
  { kind: "exam", collection: "exams" },
  { kind: "question", collection: "questions" },
  { kind: "submission", collection: "examsubmissions" },
  { kind: "payment", collection: "payments" },
  { kind: "expense", collection: "expenses" },
  { kind: "progress", collection: "lessonprogresses" },
  { kind: "attendance", collection: "attendances" },
] as const;

export type Kind = (typeof KINDS)[number]["kind"];
export interface DemoDoc { kind: Kind; key: string; doc: Record<string, any> }

// ---- deterministic randomness ----
function rng(seed: string) {
  let a = crypto.createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE = ["أحمد", "محمد", "يوسف", "عمر", "علي", "مصطفى", "كريم", "حسن", "زياد", "مازن", "آدم", "سيف", "إياد", "مروان", "خالد", "طارق", "ياسين", "عبدالرحمن", "أنس", "حمزة"];
const FEMALE = ["مريم", "سلمى", "جنى", "ملك", "فاطمة", "نور", "هنا", "رنا", "سارة", "ليلى", "ريم", "جودي", "حبيبة", "آية", "منة", "شهد", "تسنيم", "دينا", "ياسمين", "لمى"];
const FATHERS = ["محمود", "إبراهيم", "سامح", "أشرف", "هشام", "وليد", "شريف", "عادل", "ممدوح", "رأفت", "حسام", "أيمن", "ناصر", "جمال", "عصام", "طلعت", "مجدي", "فتحي", "رضا", "صلاح"];
const FAMILIES = ["الشناوي", "الدمرداش", "عبدالسلام", "النجار", "الجندي", "الحلواني", "البنا", "الفقي", "المنياوي", "الزيات", "الشربيني", "العطار", "القاضي", "السيوفي", "الصاوي", "المصري", "رشدان", "غنيم", "عرفة", "سليم"];
const DAY_PAIRS: Array<[number, number]> = [[0, 3], [1, 4], [2, 5], [0, 2], [1, 3], [3, 5]]; // indexes into DAYS (Sat..Thu)
const DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const JS_DAY = [6, 0, 1, 2, 3, 4, 5]; // DAYS index -> Date.getUTCDay()
const TIMES = [["14:00", "15:30", "2:00 ظهراً"], ["16:00", "17:30", "4:00 عصراً"], ["18:00", "19:30", "6:00 مساءً"], ["10:00", "11:30", "10:00 صباحاً"]];
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const UNITS = ["الوحدة الأولى: الأعداد", "الوحدة الثانية: العمليات الحسابية", "الوحدة الثالثة: الكسور", "الوحدة الرابعة: الهندسة", "الوحدة الخامسة: القياس والإحصاء"];
const LESSONS = ["مقدمة وتأسيس", "شرح المفاهيم الأساسية", "أمثلة محلولة", "تدريبات متدرجة", "حل مسائل كلامية", "مراجعة شاملة", "أفكار الامتحان", "اختبار قصير ومناقشة"];
const EXPENSES: Array<[string, number, number]> = [
  ["إيجار المقر", 6000, 9000], ["فاتورة الكهرباء", 600, 1800], ["اشتراك الإنترنت", 350, 700], ["طباعة مذكرات", 400, 2500],
  ["أدوات مكتبية وأقلام سبورة", 150, 600], ["صيانة أجهزة", 300, 1500], ["مكافآت مساعدين", 1500, 4000], ["نظافة وضيافة", 200, 700],
];
const FEES = [250, 275, 300, 350, 400, 450];

const pick = <T>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
const int = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const pad = (n: number, w: number) => String(n).padStart(w, "0");
const dayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

function shuffled<T>(r: () => number, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function question(r: () => number, gradeIdx: number) {
  const max = 10 + gradeIdx * 15;
  const a = int(r, 2, max), b = int(r, 2, Math.max(3, Math.floor(max / 2)));
  const kind = int(r, 0, 4);
  if (kind === 4) {
    const n = int(r, 10, 99);
    const isEven = n % 2 === 0;
    const claimEven = r() < 0.5;
    return { text: `العدد ${n} عدد ${claimEven ? "زوجي" : "فردي"}.`, type: "truefalse", options: [], correctAnswer: String(claimEven === isEven), points: 1 };
  }
  const [sym, val] = kind === 0 ? ["+", a + b] : kind === 1 ? ["-", a + b - b] : kind === 2 ? ["×", a * b] : ["÷", a];
  const left = kind === 1 ? a + b : kind === 3 ? a * b : a;
  const correct = String(val);
  const opts = new Set([correct]);
  while (opts.size < 4) opts.add(String(Math.max(0, val + int(r, -9, 9) || val + opts.size)));
  return { text: `ما ناتج ${left} ${sym} ${b}؟`, type: "mcq", options: shuffled(r, [...opts]), correctAnswer: correct, points: kind >= 2 ? 2 : 1 };
}

export function generate(batch: string, counts: Counts, anchor: Date, passwordHash: string): { docs: DemoDoc[]; capped: Partial<Record<keyof Counts, number>> } {
  const r = rng(`${batch}|${anchor.toISOString().slice(0, 10)}`);
  const id = (kind: Kind, key: string | number) => demoId(batch, kind, key);
  const today = dayUTC(anchor);
  const docs: DemoDoc[] = [];
  const capped: Partial<Record<keyof Counts, number>> = {};
  const add = (kind: Kind, key: string, doc: Record<string, any>) => docs.push({ kind, key, doc: { _id: id(kind, key), ...doc } });
  const created = (daysAgo: number) => { const d = addDays(today, -daysAgo); return { createdAt: d, updatedAt: d }; };

  // Groups
  const groups: Array<{ key: string; _id: Types.ObjectId; grade: string; gradeIdx: number; days: [number, number]; time: string[] }> = [];
  for (let g = 0; g < counts.groups; g++) {
    const gradeIdx = g % ACADEMIC_GRADES.length;
    const days = DAY_PAIRS[g % DAY_PAIRS.length];
    const time = TIMES[Math.floor(g / ACADEMIC_GRADES.length) % TIMES.length];
    const key = pad(g + 1, 3);
    groups.push({ key, _id: id("group", key), grade: ACADEMIC_GRADES[gradeIdx], gradeIdx, days, time });
    add("group", key, {
      name: `مجموعة ${DAYS[days[0]]} و${DAYS[days[1]]} - ${time[2]}`,
      academicYear: ACADEMIC_GRADES[gradeIdx], days: days.map((d) => DAYS[d]), time: time[2], ...created(150 + g),
    });
    add("session", `${key}-1`, { dayIndex: days[0], startTime: time[0], endTime: time[1], group: id("group", key), subject: "رياضيات", ...created(150) });
    add("session", `${key}-2`, { dayIndex: days[1], startTime: time[0], endTime: time[1], group: id("group", key), subject: "رياضيات", ...created(150) });
  }

  // Students (+ login accounts with an unknown random password: nobody can sign in until an admin resets it)
  const students: Array<{ key: string; _id: Types.ObjectId; group: (typeof groups)[number]; ability: number; active: boolean }> = [];
  for (let s = 0; s < counts.students; s++) {
    const group = groups[s % groups.length];
    const female = r() < 0.5;
    const name = `${pick(r, female ? FEMALE : MALE)} ${pick(r, FATHERS)} ${pick(r, FAMILIES)}`;
    const key = pad(s + 1, 4);
    const active = r() > 0.08;
    const birthYear = today.getUTCFullYear() - (7 + group.gradeIdx + (group.gradeIdx >= 3 ? 6 : 0)) - int(r, 0, 1);
    students.push({ key, _id: id("student", key), group, ability: 0.35 + r() * 0.6, active });
    add("student", key, {
      name,
      // Synthetic, undeliverable numbers ("0000…"); the WhatsApp sender refuses them.
      phone: `00001${pad(s + 1, 6)}`, fatherPhone: `00002${pad(s + 1, 6)}`,
      academicYear: group.grade, birthday: new Date(Date.UTC(birthYear, int(r, 0, 11), int(r, 1, 28))),
      status: active ? "active" : "inactive", group: group._id, ...created(int(r, 5, 140)),
    });
    add("account", key, {
      name, email: `demo.student${key}@example.com`, password: passwordHash, role: "student",
      studentId: id("student", key), ...created(140),
    });
  }

  // Staff (employees only; existing admins are never touched)
  for (let t = 0; t < counts.staff; t++) {
    const female = r() < 0.4;
    const key = pad(t + 1, 3);
    add("staff", key, {
      name: `أ. ${pick(r, female ? FEMALE : MALE)} ${pick(r, FAMILIES)}`,
      email: `demo.staff${key}@example.com`, password: passwordHash, role: "employee", ...created(160 - t),
    });
  }

  // Lectures (spread evenly over grades)
  const lecturesByGrade = new Map<string, Array<{ key: string; id: Types.ObjectId }>>();
  for (let l = 0; l < counts.lectures; l++) {
    const gradeIdx = l % ACADEMIC_GRADES.length;
    const n = Math.floor(l / ACADEMIC_GRADES.length);
    const unit = UNITS[Math.floor(n / 3) % UNITS.length];
    const key = pad(l + 1, 3);
    const lid = id("lecture", key);
    lecturesByGrade.set(ACADEMIC_GRADES[gradeIdx], [...(lecturesByGrade.get(ACADEMIC_GRADES[gradeIdx]) || []), { key, id: lid }]);
    add("lecture", key, {
      title: `${LESSONS[n % LESSONS.length]} - ${unit.split(":")[1]?.trim() || unit} (${n + 1})`,
      academicYear: ACADEMIC_GRADES[gradeIdx], section: unit,
      vimeoId: DEMO_VIMEO_IDS[l % DEMO_VIMEO_IDS.length],
      description: "محاضرة تجريبية لعرض المنصة.", order: n + 1, ...created(120 - (l % 100)),
    });
  }

  // Exams (past dates only, so none can be started) + questions
  const exams: Array<{ key: string; _id: Types.ObjectId; group: (typeof groups)[number]; date: Date; questions: Array<{ _id: Types.ObjectId; correct: string; options: string[]; type: string; points: number }> }> = [];
  for (let e = 0; e < counts.exams && groups.length > 0; e++) {
    const group = groups[e % groups.length];
    const key = pad(e + 1, 3);
    const date = addDays(today, -int(r, 3, 120));
    const ex = { key, _id: id("exam", key), group, date, questions: [] as any[] };
    exams.push(ex);
    add("exam", key, {
      title: `${pick(r, ["اختبار شهري", "اختبار قصير", "امتحان الوحدة", "تقييم أسبوعي"])} رقم ${e + 1}`,
      academicYear: group.grade, group: group._id, date, startTime: group.time[0], durationMins: pick(r, [20, 30, 45, 60]),
      resultsPublished: r() < 0.8, ...created(Math.max(1, Math.round((today.getTime() - date.getTime()) / 86_400_000) + 7)),
    });
    for (let q = 0; q < counts.questionsPerExam; q++) {
      const qk = `${key}-${pad(q + 1, 2)}`;
      const qd = question(r, group.gradeIdx);
      ex.questions.push({ _id: id("question", qk), correct: qd.correctAnswer, options: qd.options, type: qd.type, points: qd.points });
      add("question", qk, { exam: ex._id, ...qd, ...created(130) });
    }
  }

  // Submissions: students of the exam's grade, scored exactly like submitExam
  const byGrade = new Map<string, typeof students>();
  students.forEach((s) => byGrade.set(s.group.grade, [...(byGrade.get(s.group.grade) || []), s]));
  const pairs: Array<[number, (typeof students)[number]]> = [];
  exams.forEach((ex, ei) => shuffled(r, byGrade.get(ex.group.grade) || []).forEach((s) => pairs.push([ei, s])));
  const subPairs = interleave(pairs, exams.length).slice(0, counts.submissions);
  if (subPairs.length < counts.submissions) capped.submissions = subPairs.length;
  for (const [ei, s] of subPairs) {
    const ex = exams[ei];
    let score = 0, totalPoints = 0;
    const answers = ex.questions.map((q) => {
      totalPoints += q.points;
      const right = r() < s.ability;
      const answer = right ? q.correct : q.type === "truefalse" ? String(q.correct !== "true") : (q.options.find((o) => o !== q.correct) || "0");
      if (right) score += q.points;
      return { question: q._id, answer, isCorrect: right };
    });
    const key = `${ex.key}-${s.key}`;
    const submittedAt = new Date(ex.date.getTime() + int(r, 10, 50) * 60_000);
    add("submission", key, { exam: ex._id, student: s._id, answers, score, totalPoints, submittedAt, createdAt: submittedAt, updatedAt: submittedAt });
  }

  // Payments: one per (student, month) over the last 6 months, most recent months first
  const monthSlots: Array<[(typeof students)[number], number]> = [];
  for (let m = 0; m < 6; m++) shuffled(r, students.filter((s) => s.active || m > 2)).forEach((s) => monthSlots.push([s, m]));
  const paySlots = monthSlots.slice(0, counts.payments);
  if (paySlots.length < counts.payments) capped.payments = paySlots.length;
  for (const [s, m] of paySlots) {
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1));
    const maxDay = m === 0 ? Math.max(1, today.getUTCDate()) : 25;
    const date = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), int(r, 1, maxDay), int(r, 9, 20)));
    add("payment", `${s.key}-${m}`, {
      student: s._id, amount: FEES[s.group.gradeIdx], month: MONTHS[monthStart.getUTCMonth()], date, createdAt: date, updatedAt: date,
    });
  }

  // Expenses
  for (let x = 0; x < counts.expenses; x++) {
    const [title, min, max] = EXPENSES[x % EXPENSES.length];
    const date = addDays(today, -int(r, 0, 180));
    add("expense", pad(x + 1, 3), { title, amount: Math.round(int(r, min, max) / 10) * 10, date, createdAt: date, updatedAt: date });
  }

  // Lesson progress: student x lecture of the same grade
  const progSlots: Array<[(typeof students)[number], { key: string; id: Types.ObjectId }, number]> = [];
  students.forEach((s) => (lecturesByGrade.get(s.group.grade) || []).forEach((lec, i) => progSlots.push([s, lec, i])));
  const progress = shuffled(r, progSlots).sort((a, b) => a[2] - b[2]).slice(0, counts.progress); // earlier lessons first
  if (progress.length < counts.progress) capped.progress = progress.length;
  for (const [s, lec] of progress) {
    const pct = r() < 0.55 ? 100 : int(r, 5, 95);
    const d = addDays(today, -int(r, 0, 60));
    add("progress", `${s.key}-${lec.key}`, {
      studentId: s._id, lectureId: lec.id, progressPercent: pct, completed: pct === 100,
      lastTime: Math.round((pct / 100) * int(r, 900, 2700)), createdAt: d, updatedAt: d,
    });
  }

  // Attendance: each group's two weekly days for the last N weeks (UTC midnight, as the API stores it)
  for (const g of groups) {
    const members = students.filter((s) => s.group === g && s.active);
    for (let back = 1; back <= counts.attendanceWeeks * 7; back++) {
      const date = addDays(today, -back);
      if (!g.days.some((d) => JS_DAY[d] === date.getUTCDay())) continue;
      add("attendance", `${g.key}-${date.toISOString().slice(0, 10)}`, {
        date, group: g._id,
        records: members.map((s) => ({ student: s._id, status: r() < 0.82 + s.ability * 0.15 ? "present" : "absent", time: new Date(date.getTime() + 16 * 3_600_000) })),
        createdAt: date, updatedAt: date,
      });
    }
  }
  return { docs, capped };
}

// Round-robin over exams so submissions are spread across all exams.
function interleave<T extends [number, unknown]>(pairs: T[], buckets: number): T[] {
  const lists: T[][] = Array.from({ length: buckets }, () => []);
  pairs.forEach((p) => lists[p[0]].push(p));
  const out: T[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) lists.forEach((l) => { if (i < l.length) out.push(l[i]); });
  return out;
}

// Vimeo ids used for demo lectures (comma-separated DEMO_VIMEO_IDS). Supply public, embeddable
// videos you own or are allowed to show; the placeholder below does not play.
export const DEMO_VIMEO_IDS = (process.env.DEMO_VIMEO_IDS || "000000000").split(",").map((s) => s.trim()).filter(Boolean);
