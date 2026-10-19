// Removes ONE demo batch. Explicit command only.
//
// Dry run (default, read-only):
//   node dist/scripts/cleanupDemo.js --confirm-db academy
// Apply:
//   node dist/scripts/cleanupDemo.js --apply --confirm-db academy --backup /backups/academy-mongo-YYYYMMDD-HHMMSS.archive.gz
//
// Ownership proof: a document is deleted only if (a) the batch registry lists it and (b) its _id
// equals the id deterministically derived from that batch/kind/key. Before anything is deleted,
// the command stops if any non-demo record references a demo record (e.g. a real payment made
// for a demo student), so real data is never orphaned.
import mongoose from "mongoose";
import UserModel from "../models/userModel";
import { KINDS, Kind } from "./demo/generate";
import {
  MANIFESTS, REGISTRY, Args, acquireLock, assertDatabase, assertRecentBackup, batchFrom, connect,
  demoId, parseArgs, printTable, registryId, releaseLock,
} from "./demo/shared";
import { MODELS } from "./seedDemo";

// Fields in each collection that may reference demo documents of a kind.
const INBOUND: Array<{ kind: Kind; field: string; target: Kind }> = [
  { kind: "student", field: "group", target: "group" },
  { kind: "exam", field: "group", target: "group" },
  { kind: "session", field: "group", target: "group" },
  { kind: "attendance", field: "group", target: "group" },
  { kind: "attendance", field: "records.student", target: "student" },
  { kind: "account", field: "studentId", target: "student" },
  { kind: "payment", field: "student", target: "student" },
  { kind: "submission", field: "student", target: "student" },
  { kind: "submission", field: "exam", target: "exam" },
  { kind: "submission", field: "answers.question", target: "question" },
  { kind: "question", field: "exam", target: "exam" },
  { kind: "progress", field: "studentId", target: "student" },
  { kind: "progress", field: "lectureId", target: "lecture" },
];

async function main(args: Args): Promise<void> {
  const apply = args.apply === true;
  const batch = batchFrom(args);
  const dbName = await connect();
  assertDatabase(dbName, args, apply);
  const db = mongoose.connection;

  console.log(`Target database: ${dbName}`);
  console.log(`Demo batch:      ${batch}`);
  console.log(`Mode:            ${apply ? "APPLY" : "DRY RUN (no writes)"}`);

  const entries = await db.collection(REGISTRY).find({ batch }).toArray();
  const collectionOf = new Map(KINDS.map((k) => [k.kind, MODELS[k.kind].collection.name]));
  const ids = new Map<Kind, any[]>();
  for (const e of entries) {
    const kind = e.kind as Kind;
    const proven = collectionOf.get(kind) === e.collection
      && String(e._id) === registryId(batch, kind, e.key)
      && String(e.docId) === String(demoId(batch, kind, e.key));
    if (!proven) throw new Error(`Registry entry ${String(e._id)} failed the ownership check. Nothing was deleted.`);
    ids.set(kind, [...(ids.get(kind) || []), e.docId]);
  }
  const all = (kind: Kind) => ids.get(kind) || [];
  const userIds = [...all("staff"), ...all("account")];

  // Safety: demo users must still be non-admins.
  const admins = await UserModel.collection.countDocuments({ _id: { $in: userIds }, role: "admin" });
  if (admins > 0) throw new Error(`${admins} registered demo user(s) now have the admin role. Resolve manually. Nothing was deleted.`);

  // Safety: no non-demo record may reference a demo record.
  const external: Record<string, number> = {};
  for (const ref of INBOUND) {
    const targets = all(ref.target);
    if (targets.length === 0) continue;
    const own = ref.kind === "staff" || ref.kind === "account" ? userIds : all(ref.kind);
    const coll = MODELS[ref.kind].collection;
    const n = await coll.countDocuments({ [ref.field]: { $in: targets }, _id: { $nin: own } });
    if (n > 0) external[`${coll.name}.${ref.field}`] = n;
  }
  const enrollments = all("student").length
    ? await db.collection("enrollments").countDocuments({ studentId: { $in: all("student") } })
    : 0;
  if (enrollments > 0) external["enrollments.studentId"] = enrollments;

  const rows = [];
  for (const { kind } of KINDS) {
    const list = all(kind);
    const present = list.length ? await MODELS[kind].collection.countDocuments({ _id: { $in: list } }) : 0;
    rows.push({ kind, registered: list.length, present });
  }
  printTable(rows);
  if (Object.keys(external).length) {
    throw new Error(`Non-demo records reference demo records ${JSON.stringify(external)}. ` +
      "Ownership of those cannot be proven; resolve them manually. Nothing was deleted.");
  }
  if (entries.length === 0) {
    console.log("No registered records for this batch. Nothing to do.");
    return;
  }
  if (!apply) {
    console.log("DRY RUN complete: nothing was deleted. Rerun with --apply --confirm-db <db> --backup <file>.");
    return;
  }

  console.log(`Backup verified: ${await assertRecentBackup(args.backup)}`);
  await acquireLock(batch, "cleanup", args["release-stale-lock"] === true);
  try {
    const deleted: Record<string, number> = {};
    // Children first: an interrupted run never leaves demo children pointing at deleted parents.
    for (const { kind } of [...KINDS].reverse()) {
      const list = all(kind);
      if (list.length === 0) continue;
      const res = await MODELS[kind].collection.deleteMany({ _id: { $in: list } });
      deleted[kind] = res.deletedCount;
      await db.collection(REGISTRY).deleteMany({ batch, kind, docId: { $in: list } });
    }
    await db.collection(MANIFESTS).deleteOne({ _id: batch as any });
    console.log(`APPLY complete. Deleted: ${JSON.stringify(deleted)}`);
  } finally {
    await releaseLock();
  }
}

if (require.main === module) {
  main(parseArgs(process.argv.slice(2)))
    .then(() => mongoose.disconnect())
    .catch(async (e) => {
      console.error(`Demo cleanup stopped: ${e?.message || e}`);
      await mongoose.disconnect().catch(() => undefined);
      process.exit(1);
    });
}
