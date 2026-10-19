// Demo seed / cleanup tests against an isolated in-memory MongoDB (no real data, no network).
// Runs the compiled commands exactly as an operator would (`npm run build` first).
const test = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { MongoClient, ObjectId } = require("mongodb");
const { MongoMemoryServer } = require("mongodb-memory-server");

const DB = "academy_demo_test";
let mongo, client, db, backup, env;

function run(script, args, extraEnv = {}) {
  try {
    const out = execFileSync("node", [`dist/scripts/${script}.js`, ...args], { env: { ...env, ...extraEnv }, encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
}
const seed = (...a) => run("seedDemo", ["--confirm-db", DB, ...a]);
const seedApply = (...a) => seed("--apply", "--backup", backup, ...a);
const cleanup = (...a) => run("cleanupDemo", ["--confirm-db", DB, ...a]);
const cleanupApply = (...a) => cleanup("--apply", "--backup", backup, ...a);

// Fingerprint of every collection (names, counts and full content) to prove "zero writes".
async function snapshot() {
  const cols = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const out = {};
  for (const c of cols) {
    const docs = await db.collection(c).find().sort({ _id: 1 }).toArray();
    out[c] = `${docs.length}:${crypto.createHash("sha256").update(JSON.stringify(docs)).digest("hex")}`;
  }
  return out;
}
const count = (c, q = {}) => db.collection(c).countDocuments(q);

const real = {
  admin: new ObjectId(), group: new ObjectId(), student: new ObjectId(), payment: new ObjectId(), lecture: new ObjectId(),
};

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongo.getUri());
  db = client.db(DB);
  env = { ...process.env, NODE_ENV: "test", JWT_SECRET: "t".repeat(40), MONGO_URI: mongo.getUri(DB), DEMO_ALLOWED_DB_NAMES: DB };

  // Pre-existing "real" data that must survive everything.
  await db.collection("users").insertOne({ _id: real.admin, name: "Admin", email: "admin@academy.test", password: "$2b$10$realhashrealhashrealhashrealhashrealhashrealhashreal", role: "admin" });
  await db.collection("groups").insertOne({ _id: real.group, name: "Real group", academicYear: "الصف الاول", days: ["السبت"], time: "4:00" });
  await db.collection("students").insertOne({ _id: real.student, name: "Real Student", phone: "01011112222", fatherPhone: "01033334444", academicYear: "الصف الاول", birthday: new Date("2015-01-01"), status: "active", group: real.group });
  await db.collection("payments").insertOne({ _id: real.payment, student: real.student, amount: 300, month: "أكتوبر", date: new Date() });
  await db.collection("lectures").insertOne({ _id: real.lecture, title: "Real lecture", academicYear: "الصف الاول", vimeoId: "123", order: 1 });

  // A verified backup in deploy/backup.sh format (name, size, gzip, .sha256).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "academy-bk-"));
  backup = path.join(dir, "academy-mongo-20261019-120000.archive.gz");
  fs.writeFileSync(backup, zlib.gzipSync(crypto.randomBytes(8192)));
  fs.writeFileSync(`${backup}.sha256`, `${crypto.createHash("sha256").update(fs.readFileSync(backup)).digest("hex")}  ${path.basename(backup)}\n`);
});

test.after(async () => {
  await client?.close();
  await mongo?.stop();
});

let adminBefore;

test("seed dry run performs zero writes", async () => {
  adminBefore = await db.collection("users").findOne({ _id: real.admin });
  const before = await snapshot();
  const res = seed();
  assert.strictEqual(res.code, 0, res.out);
  assert.match(res.out, /DRY RUN complete/);
  assert.match(res.out, /student\s+200\s+0\s+200/);
  assert.deepStrictEqual(await snapshot(), before);
  assert.ok(!res.out.includes("mongodb://"), "connection string must never be printed");
});

test("apply is refused without confirmation, backup, or an allowed database", async () => {
  const before = await snapshot();
  assert.notStrictEqual(run("seedDemo", ["--apply", "--backup", backup]).code, 0);
  assert.notStrictEqual(run("seedDemo", ["--apply", "--confirm-db", "academy", "--backup", backup]).code, 0);
  assert.notStrictEqual(seed("--apply").code, 0);
  const stale = path.join(path.dirname(backup), "academy-mongo-20200101-000000.archive.gz");
  fs.copyFileSync(backup, stale);
  fs.copyFileSync(`${backup}.sha256`, `${stale}.sha256`);
  fs.utimesSync(stale, new Date("2020-01-01"), new Date("2020-01-01"));
  assert.match(seed("--apply", "--backup", stale).out, /h old/);
  assert.match(run("seedDemo", ["--confirm-db", DB], { DEMO_ALLOWED_DB_NAMES: "academy" }).out, /not in DEMO_ALLOWED_DB_NAMES/);
  assert.deepStrictEqual(await snapshot(), before);
});

test("apply creates the related demo dataset", async () => {
  const res = seedApply();
  assert.strictEqual(res.code, 0, res.out);
  const expected = { groups: 21, students: 201, users: 216, sessions: 40, lectures: 61, exams: 30, questions: 450, examsubmissions: 500, payments: 301, expenses: 50, lessonprogresses: 600, attendances: 160 };
  for (const [c, n] of Object.entries(expected)) assert.strictEqual(await count(c), n, c);
  assert.strictEqual(await count("demo_records", { batch: "academy-showcase-v1" }), 2625);
});

test("references, scores and accounting data are consistent", async () => {
  const ids = async (c) => new Set((await db.collection(c).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));
  const groups = await ids("groups"), students = await ids("students"), exams = await ids("exams"), lectures = await ids("lectures");
  for (const s of await db.collection("students").find().toArray()) assert.ok(groups.has(String(s.group)));
  for (const u of await db.collection("users").find({ role: "student" }).toArray()) assert.ok(students.has(String(u.studentId)));
  const questions = new Map((await db.collection("questions").find().toArray()).map((q) => [String(q._id), q]));
  for (const q of questions.values()) {
    assert.ok(exams.has(String(q.exam)));
    if (q.type === "mcq") assert.ok(q.options.includes(q.correctAnswer));
    else assert.ok(["true", "false"].includes(q.correctAnswer));
  }
  const pairs = new Set();
  for (const sub of await db.collection("examsubmissions").find().toArray()) {
    assert.ok(exams.has(String(sub.exam)) && students.has(String(sub.student)));
    const key = `${sub.exam}-${sub.student}`;
    assert.ok(!pairs.has(key), "one submission per student per exam");
    pairs.add(key);
    let score = 0, total = 0;
    for (const a of sub.answers) {
      const q = questions.get(String(a.question));
      assert.ok(q && String(q.exam) === String(sub.exam));
      total += q.points;
      const ok = q.correctAnswer.trim().toLowerCase() === a.answer.trim().toLowerCase();
      assert.strictEqual(a.isCorrect, ok);
      if (ok) score += q.points;
    }
    assert.deepStrictEqual([sub.score, sub.totalPoints], [score, total]);
  }
  const pay = new Set();
  for (const p of await db.collection("payments").find().toArray()) {
    assert.ok(students.has(String(p.student)) && p.amount > 0);
    const key = `${p.student}-${p.month}`;
    assert.ok(!pay.has(key), "no duplicate monthly payment");
    pay.add(key);
  }
  for (const lp of await db.collection("lessonprogresses").find().toArray()) {
    assert.ok(students.has(String(lp.studentId)) && lectures.has(String(lp.lectureId)));
    assert.strictEqual(lp.completed, lp.progressPercent === 100);
  }
  for (const a of await db.collection("attendances").find().toArray()) {
    const members = new Set((await db.collection("students").find({ group: a.group }, { projection: { _id: 1 } }).toArray()).map((s) => String(s._id)));
    a.records.forEach((r) => assert.ok(members.has(String(r.student))));
  }
  for (const e of await db.collection("exams").find().toArray()) assert.ok(e.date < new Date(), "demo exams are in the past");
  // Synthetic contact data only.
  assert.strictEqual(await count("students", { _id: { $ne: real.student }, phone: { $not: /^00001\d{6}$/ } }), 0);
  assert.strictEqual(await count("users", { _id: { $ne: real.admin }, email: { $not: /@example\.com$/ } }), 0);
  assert.strictEqual(await count("users", { _id: { $ne: real.admin }, role: "admin" }), 0);
});

test("running twice creates no duplicates", async () => {
  const before = await snapshot();
  const res = seedApply();
  assert.strictEqual(res.code, 0, res.out);
  assert.match(res.out, /Created: \{\}/);
  assert.deepStrictEqual(await snapshot(), before);
});

test("a partial run resumes without duplicates", async () => {
  const full = await snapshot();
  // Simulate a crash: registry written, but some documents missing.
  const prog = await db.collection("demo_records").find({ kind: "progress" }).limit(37).toArray();
  await db.collection("lessonprogresses").deleteMany({ _id: { $in: prog.map((r) => r.docId) } });
  const att = await db.collection("demo_records").find({ kind: "attendance" }).toArray();
  await db.collection("attendances").deleteMany({ _id: { $in: att.map((r) => r.docId) } });
  const res = seedApply();
  assert.strictEqual(res.code, 0, res.out);
  assert.match(res.out, /"progress":37/);
  assert.match(res.out, /"attendance":160/);
  assert.deepStrictEqual(Object.keys(await snapshot()), Object.keys(full));
  assert.strictEqual(await count("lessonprogresses"), 600);
  assert.strictEqual(await count("attendances"), 160);
});

test("changed counts for an existing batch and concurrent runs are refused", async () => {
  assert.match(seedApply("--counts", "students=10").out, /different counts/);
  await db.collection("demo_seed_locks").insertOne({ _id: "academy-demo", op: "seed", startedAt: new Date() });
  assert.match(seedApply().out, /already running|is running or crashed/);
  await db.collection("demo_seed_locks").deleteOne({ _id: "academy-demo" });
});

test("cleanup dry run performs zero writes and stops on real references", async () => {
  const before = await snapshot();
  const res = cleanup();
  assert.strictEqual(res.code, 0, res.out);
  assert.match(res.out, /DRY RUN complete/);
  assert.deepStrictEqual(await snapshot(), before);

  // A real payment recorded for a demo student blocks cleanup (ownership cannot be proven).
  const demoStudent = (await db.collection("demo_records").findOne({ kind: "student" })).docId;
  const realPay = await db.collection("payments").insertOne({ student: demoStudent, amount: 100, month: "أكتوبر", date: new Date() });
  const blocked = cleanupApply();
  assert.notStrictEqual(blocked.code, 0);
  assert.match(blocked.out, /Non-demo records reference demo records/);
  await db.collection("payments").deleteOne({ _id: realPay.insertedId });
});

test("cleanup removes only demo records and keeps real data and the admin", async () => {
  const res = cleanupApply();
  assert.strictEqual(res.code, 0, res.out);
  const remaining = { groups: 1, students: 1, users: 1, payments: 1, lectures: 1, sessions: 0, exams: 0, questions: 0, examsubmissions: 0, expenses: 0, lessonprogresses: 0, attendances: 0 };
  for (const [c, n] of Object.entries(remaining)) assert.strictEqual(await count(c), n, c);
  assert.deepStrictEqual(await db.collection("users").findOne({ _id: real.admin }), adminBefore);
  assert.ok(await db.collection("students").findOne({ _id: real.student }));
  assert.ok(await db.collection("payments").findOne({ _id: real.payment }));
  assert.strictEqual(await count("demo_records"), 0);
  assert.strictEqual(await count("demo_batches"), 0);
  assert.strictEqual(await count("demo_seed_locks"), 0);
});

test("no external actions: WhatsApp refuses synthetic numbers; scripts never import messaging", () => {
  const { isSyntheticPhone } = require("../dist/utils/whatsapp");
  assert.ok(isSyntheticPhone("00001000001") && isSyntheticPhone("20000100001") && isSyntheticPhone("+20 0002 000001"));
  assert.ok(!isSyntheticPhone("01012345678") && !isSyntheticPhone("201012345678"));
  for (const f of ["seedDemo", "cleanupDemo", "demo/shared", "demo/generate"]) {
    const src = fs.readFileSync(path.join(__dirname, `../src/scripts/${f}.ts`), "utf8");
    assert.ok(!/whatsapp|controllers|fetch\(|https?:\/\//i.test(src.replace(/\/\/.*$/gm, "")), f);
  }
});
