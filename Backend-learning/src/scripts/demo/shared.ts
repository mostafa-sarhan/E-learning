// Shared safety helpers for the demo seed / cleanup commands.
// Nothing here runs at application startup; it is only imported by the explicit scripts.
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";
import mongoose, { Types } from "mongoose";
import { env } from "../../config/env";

export const DEFAULT_BATCH = "academy-showcase-v1";
export const REGISTRY = "demo_records";   // { _id: "<batch>:<kind>:<key>", batch, kind, key, collection, docId }
export const MANIFESTS = "demo_batches";  // { _id: "<batch>", counts, anchorDate, createdAt }
export const LOCKS = "demo_seed_locks";   // { _id: "academy-demo", batch, op, startedAt, host }
const LOCK_ID = "academy-demo";
const STALE_LOCK_MS = 2 * 60 * 60 * 1000;

export type Args = Record<string, string | boolean>;

export function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) throw new Error(`Unexpected argument: ${a}`);
    const eq = a.indexOf("=");
    if (eq > 0) out[a.slice(2, eq)] = a.slice(eq + 1);
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return out;
}

export function batchFrom(args: Args): string {
  const batch = String(args.batch || process.env.DEMO_BATCH_ID || DEFAULT_BATCH);
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(batch)) throw new Error("Batch id must be 3-63 chars of a-z, 0-9 and '-'.");
  return batch;
}

// Deterministic ObjectId derived from the batch: reruns produce the same ids (no duplicates),
// and only this batch can produce them (ownership proof together with the registry).
export function demoId(batch: string, kind: string, key: string | number): Types.ObjectId {
  const hex = crypto.createHash("sha256").update(`${batch}|${kind}|${key}`).digest("hex").slice(0, 24);
  return new Types.ObjectId(hex);
}

export function registryId(batch: string, kind: string, key: string | number): string {
  return `${batch}:${kind}:${key}`;
}

export async function connect(): Promise<string> {
  // autoIndex/autoCreate off: a dry run must not create collections or indexes.
  await mongoose.connect(env.mongoUri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  return mongoose.connection.name;
}

export function assertDatabase(dbName: string, args: Args, requireConfirm: boolean): void {
  const allowed = (process.env.DEMO_ALLOWED_DB_NAMES || "academy").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(dbName)) {
    throw new Error(`Database "${dbName}" is not in DEMO_ALLOWED_DB_NAMES (${allowed.join(", ")}). Refusing.`);
  }
  if (requireConfirm && args["confirm-db"] !== dbName) {
    throw new Error(`--apply requires --confirm-db ${dbName} (the connected database name).`);
  }
}

// Verifies a backup produced by deploy/backup.sh: naming, age, size, gzip integrity and checksum.
export async function assertRecentBackup(file: string | boolean | undefined): Promise<string> {
  if (typeof file !== "string" || !file) throw new Error("--apply requires --backup <path to academy-mongo-*.archive.gz>.");
  const base = path.basename(file);
  if (!/^academy-mongo-\d{8}-\d{6}\.archive\.gz$/.test(base)) throw new Error("Backup file name does not match academy-mongo-YYYYMMDD-HHMMSS.archive.gz.");
  const stat = fs.statSync(file);
  if (stat.size < 1024) throw new Error("Backup file is too small.");
  const maxAgeH = Number(process.env.DEMO_BACKUP_MAX_AGE_HOURS || 24);
  const ageH = (Date.now() - stat.mtimeMs) / 3_600_000;
  if (ageH > maxAgeH) throw new Error(`Backup is ${ageH.toFixed(1)} h old (limit ${maxAgeH} h). Take a fresh backup.`);

  const shaFile = `${file}.sha256`;
  if (!fs.existsSync(shaFile)) throw new Error("Backup checksum file (.sha256) is missing.");
  const expected = fs.readFileSync(shaFile, "utf8").trim().split(/\s+/)[0];
  const actual = await new Promise<string>((resolve, reject) => {
    const h = crypto.createHash("sha256");
    fs.createReadStream(file).on("data", (d) => h.update(d)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
  });
  if (expected !== actual) throw new Error("Backup checksum mismatch.");
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(file).pipe(zlib.createGunzip()).on("data", () => undefined).on("end", resolve).on("error", () => reject(new Error("Backup is not a complete gzip stream.")));
  });
  return `${base} (${(stat.size / 1024).toFixed(0)} KB, ${ageH.toFixed(1)} h old, checksum OK)`;
}

export async function acquireLock(batch: string, op: string, releaseStale: boolean): Promise<void> {
  const locks = mongoose.connection.collection(LOCKS);
  const existing = await locks.findOne({ _id: LOCK_ID as any });
  if (existing) {
    const age = Date.now() - new Date(existing.startedAt).getTime();
    if (releaseStale && age > STALE_LOCK_MS) {
      await locks.deleteOne({ _id: LOCK_ID as any, startedAt: existing.startedAt });
    } else {
      throw new Error(`Another demo ${existing.op} is running or crashed (started ${new Date(existing.startedAt).toISOString()}). ` +
        `If it is stale (>2 h), rerun with --release-stale-lock.`);
    }
  }
  try {
    await locks.insertOne({ _id: LOCK_ID as any, batch, op, startedAt: new Date(), host: os.hostname() });
  } catch (e: any) {
    if (e?.code === 11000) throw new Error("Another demo operation just started. Aborting.");
    throw e;
  }
}

export async function releaseLock(): Promise<void> {
  await mongoose.connection.collection(LOCKS).deleteOne({ _id: LOCK_ID as any }).catch(() => undefined);
}

export function printTable(rows: Array<Record<string, string | number>>): void {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const width = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
  const line = (vals: string[]) => vals.map((v, i) => (i === 0 ? v.padEnd(width[i]) : v.padStart(width[i]))).join("  ");
  console.log(line(cols));
  rows.forEach((r) => console.log(line(cols.map((c) => String(r[c])))));
}
