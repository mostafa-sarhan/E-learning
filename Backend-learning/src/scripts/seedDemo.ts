// Demo data seed. Explicit command only: never imported by the server, never run at build/startup.
//
// Dry run (default, read-only):
//   node dist/scripts/seedDemo.js --confirm-db academy
// Apply (requires a verified backup taken within DEMO_BACKUP_MAX_AGE_HOURS, default 24):
//   node dist/scripts/seedDemo.js --apply --confirm-db academy --backup /backups/academy-mongo-YYYYMMDD-HHMMSS.archive.gz
// Options: --batch <id> (default academy-showcase-v1), --counts students=200,exams=30,...,
//          --anchor-date YYYY-MM-DD (first apply only), --release-stale-lock
import crypto from "crypto";
import bcrypt from "bcrypt";
import mongoose, { Model } from "mongoose";
import AttendanceModel from "../models/attendanceModel";
import ExamModel from "../models/examModel";
import ExamSubmissionModel from "../models/examSubmissionModel";
import ExpenseModel from "../models/expenseModel";
import GroupModel from "../models/groupModel";
import LectureModel from "../models/lectureModel";
import LessonProgressModel from "../models/lessonProgressModel";
import PaymentModel from "../models/paymentModel";
import QuestionModel from "../models/questionModel";
import SessionModel from "../models/sessionModel";
import StudentModel from "../models/studentModel";
import UserModel from "../models/userModel";
import { Counts, DEMO_VIMEO_IDS, DemoDoc, KINDS, Kind, generate, parseCounts } from "./demo/generate";
import {
  MANIFESTS, REGISTRY, Args, acquireLock, assertDatabase, assertRecentBackup, batchFrom, connect,
  parseArgs, printTable, registryId, releaseLock,
} from "./demo/shared";

export const MODELS: Record<Kind, Model<any>> = {
  group: GroupModel, student: StudentModel, staff: UserModel, account: UserModel, session: SessionModel,
  lecture: LectureModel, exam: ExamModel, question: QuestionModel, submission: ExamSubmissionModel,
  payment: PaymentModel, expense: ExpenseModel, progress: LessonProgressModel, attendance: AttendanceModel,
};

// Reference fields that must point at documents of the given kind.
const REFS: Partial<Record<Kind, Array<[string, Kind]>>> = {
  student: [["group", "group"]], account: [["studentId", "student"]], session: [["group", "group"]],
  exam: [["group", "group"]], question: [["exam", "exam"]],
  submission: [["exam", "exam"], ["student", "student"], ["answers.question", "question"]],
  payment: [["student", "student"]], progress: [["studentId", "student"], ["lectureId", "lecture"]],
  attendance: [["group", "group"], ["records.student", "student"]],
};

function values(doc: any, path: string): any[] {
  const [head, tail] = path.split(".");
  const v = doc[head];
  if (tail) return (v || []).map((x: any) => x[tail]);
  return v === undefined ? [] : [v];
}

async function validate(docs: DemoDoc[]): Promise<void> {
  const ids = new Map<Kind, Set<string>>();
  docs.forEach((d) => ids.set(d.kind, (ids.get(d.kind) || new Set()).add(String(d.doc._id))));
  for (const d of docs) {
    try {
      await new (MODELS[d.kind] as any)(d.doc).validate();
    } catch (err: any) {
      throw new Error(`Generated ${d.kind} ${d.key} is invalid: ${err.message}`);
    }
    for (const [field, kind] of REFS[d.kind] || []) {
      for (const ref of values(d.doc, field)) {
        if (!ids.get(kind)?.has(String(ref))) throw new Error(`Broken reference ${d.kind}.${field} -> ${kind} in ${d.key}`);
      }
    }
  }
}

function sameCounts(a: Counts, b: Counts): boolean {
  return Object.keys(a).every((k) => (a as any)[k] === (b as any)[k]);
}

async function main(args: Args): Promise<void> {
  const apply = args.apply === true;
  const batch = batchFrom(args);
  const dbName = await connect();
  assertDatabase(dbName, args, apply);

  const db = mongoose.connection;
  const manifest = await db.collection(MANIFESTS).findOne({ _id: batch as any });
  let counts = parseCounts(args.counts);
  let anchor = args["anchor-date"] ? new Date(`${args["anchor-date"]}T00:00:00Z`) : new Date();
  if (Number.isNaN(anchor.getTime())) throw new Error("--anchor-date must be YYYY-MM-DD.");
  if (manifest) {
    // Reruns must regenerate exactly the same dataset (resume without duplicates).
    if (args.counts && !sameCounts(counts, manifest.counts)) throw new Error(`Batch ${batch} already exists with different counts. Use the same counts or a new --batch.`);
    counts = manifest.counts;
    anchor = new Date(manifest.anchorDate);
  }

  console.log(`Target database: ${dbName}`);
  console.log(`Demo batch:      ${batch} (${manifest ? "existing, resuming" : "new"})`);
  console.log(`Anchor date:     ${anchor.toISOString().slice(0, 10)}`);
  console.log(`Mode:            ${apply ? "APPLY" : "DRY RUN (no writes)"}`);
  if (DEMO_VIMEO_IDS.includes("000000000") && counts.lectures > 0) {
    console.log("Note: DEMO_VIMEO_IDS not set; demo lectures use a placeholder video id that will not play.");
  }

  let backupInfo = "";
  if (apply) backupInfo = await assertRecentBackup(args.backup);

  // Unknown random password: demo accounts cannot sign in until an admin resets a student password.
  const passwordHash = apply ? await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10) : "$2b$10$dryrun.placeholder.hash.not.written";
  const { docs, capped } = generate(batch, counts, anchor, passwordHash);
  await validate(docs);

  // Existing demo docs (resume) and conflicts with non-demo records on unique fields.
  const plan: Array<{ kind: Kind; todo: DemoDoc[]; existing: number; planned: number }> = [];
  for (const { kind } of KINDS) {
    const list = docs.filter((d) => d.kind === kind);
    const found = await MODELS[kind].collection.find({ _id: { $in: list.map((d) => d.doc._id) } }, { projection: { _id: 1 } }).toArray();
    const have = new Set(found.map((f) => String(f._id)));
    plan.push({ kind, planned: list.length, existing: have.size, todo: list.filter((d) => !have.has(String(d.doc._id))) });
  }
  const demoIds = (kind: Kind) => docs.filter((d) => d.kind === kind).map((d) => d.doc._id);
  const conflicts = {
    studentPhones: await StudentModel.collection.countDocuments({ phone: { $in: docs.filter((d) => d.kind === "student").map((d) => d.doc.phone) }, _id: { $nin: demoIds("student") } }),
    userEmails: await UserModel.collection.countDocuments({ email: { $in: docs.filter((d) => d.kind === "staff" || d.kind === "account").map((d) => d.doc.email) }, _id: { $nin: [...demoIds("staff"), ...demoIds("account")] } }),
  };

  printTable(plan.map((p) => ({ kind: p.kind, planned: p.planned, existing: p.existing, "to create": p.todo.length })));
  if (Object.keys(capped).length) console.log(`Capped by available relationships: ${JSON.stringify(capped)}`);
  if (conflicts.studentPhones || conflicts.userEmails) {
    throw new Error(`Non-demo records already use demo phones/emails (${JSON.stringify(conflicts)}). Refusing.`);
  }
  if (!apply) {
    console.log("DRY RUN complete: nothing was written. Rerun with --apply --confirm-db <db> --backup <file>.");
    return;
  }

  console.log(`Backup verified: ${backupInfo}`);
  await acquireLock(batch, "seed", args["release-stale-lock"] === true);
  try {
    await db.collection(MANIFESTS).updateOne(
      { _id: batch as any },
      { $setOnInsert: { counts, anchorDate: anchor.toISOString(), createdAt: new Date() } },
      { upsert: true },
    );
    const created: Record<string, number> = {};
    for (const p of plan) {
      if (p.todo.length === 0) continue;
      const Model = MODELS[p.kind];
      // 1) Ownership record first, so a crash never leaves an untracked demo document.
      await insertIgnoringDuplicates(db.collection(REGISTRY), p.todo.map((d) => ({
        _id: registryId(batch, p.kind, d.key) as any, batch, kind: p.kind, key: d.key,
        collection: Model.collection.name, docId: d.doc._id, createdAt: new Date(),
      })));
      // 2) The documents themselves (validated, explicit _id; existing ids are skipped).
      const rows = p.todo.map((d) => ({ ...new Model(d.doc).toObject({ depopulate: true }), __v: 0 }));
      created[p.kind] = await insertIgnoringDuplicates(Model.collection, rows);
    }
    console.log(`APPLY complete. Created: ${JSON.stringify(created)}`);
  } finally {
    await releaseLock();
  }
}

// Inserts rows; duplicate _id errors (already inserted by an earlier, interrupted run) are skipped.
// Any other error, including a unique-index conflict on another field, stops the run.
async function insertIgnoringDuplicates(collection: any, rows: any[]): Promise<number> {
  try {
    const res = await collection.insertMany(rows, { ordered: false });
    return res.insertedCount;
  } catch (e: any) {
    const errors = e?.writeErrors || [];
    const onlyIdDuplicates = errors.length > 0 && errors.every((w: any) => w.code === 11000 && /_id_/.test(w.errmsg || w.err?.errmsg || ""));
    if (!onlyIdDuplicates) throw e;
    return e.result?.insertedCount ?? e.insertedCount ?? 0;
  }
}

if (require.main === module) {
  main(parseArgs(process.argv.slice(2)))
    .then(() => mongoose.disconnect())
    .catch(async (e) => {
      console.error(`Demo seed stopped: ${e?.message || e}`);
      await mongoose.disconnect().catch(() => undefined);
      process.exit(1);
    });
}
