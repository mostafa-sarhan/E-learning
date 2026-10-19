// End-to-end auth/authorization tests against an in-memory MongoDB (no real data).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-456";
process.env.RATE_LIMIT_AUTH_MAX = "100";
process.env.RATE_LIMIT_SENSITIVE_MAX = "100";
process.env.WHATSAPP_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../dist/app").default;
const UserModel = require("../dist/models/userModel").default;
const ExamModel = require("../dist/models/examModel").default;
const QuestionModel = require("../dist/models/questionModel").default;

let mongo, server, base;
const tokens = {};
const accounts = {};

const req = (path, { token, body, method } = {}) =>
  fetch(base + path, {
    method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

async function login(email, password) {
  const res = await req("/api/auth/login", { body: { email, password } });
  return { status: res.status, data: await res.json() };
}

async function createStudent(name, phone) {
  const res = await req("/api/students", {
    token: tokens.employee,
    body: { name, phone, fatherPhone: "01000000099", academicYear: "الصف الاول", birthday: "2010-01-01", status: "active" },
  });
  assert.strictEqual(res.status, 201);
  const student = await res.json();
  const accRes = await req("/api/auth/students/account", { token: tokens.employee, body: { studentId: student._id, name } });
  assert.strictEqual(accRes.status, 201);
  return { student, account: await accRes.json() };
}

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await UserModel.create({ name: "Admin", email: "admin@test.local", password: "AdminPass123!", role: "admin" });
  await UserModel.create({ name: "Staff", email: "staff@test.local", password: "StaffPass123!", role: "employee" });
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
  tokens.admin = (await login("admin@test.local", "AdminPass123!")).data.token;
  tokens.employee = (await login("staff@test.local", "StaffPass123!")).data.token;
  accounts.a = await createStudent("Ahmed Ali", "01000000001");
  accounts.b = await createStudent("Sara Omar", "01000000002");
  const a = await login(accounts.a.account.email, accounts.a.account.password);
  tokens.studentA = a.data.token;
  accounts.a.loginBody = a.data;
});

test.after(async () => {
  server?.close();
  await mongoose.disconnect();
  await mongo?.stop();
});

test("admin and staff login return a token and never a password", async () => {
  const res = await login("admin@test.local", "AdminPass123!");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.role, "admin");
  assert.ok(res.data.token);
  assert.strictEqual(res.data.password, undefined);
  assert.ok(tokens.employee);
});

test("wrong password is rejected", async () => {
  assert.strictEqual((await login("admin@test.local", "nope")).status, 401);
});

test("student login works with the one-time password", () => {
  assert.strictEqual(accounts.a.loginBody.role, "student");
  assert.strictEqual(String(accounts.a.loginBody.studentId), accounts.a.student._id);
  assert.ok(tokens.studentA);
});

test("passwords are stored only as bcrypt hashes", async () => {
  const raw = await mongoose.connection.collection("users").findOne({ email: accounts.a.account.email });
  assert.strictEqual(raw.plainPassword, undefined);
  assert.match(raw.password, /^\$2[aby]\$/);
});

test("account endpoints never expose passwords or hashes", async () => {
  for (const path of ["/api/auth/users", "/api/auth/students/accounts"]) {
    const text = await (await req(path, { token: tokens.admin })).text();
    assert.ok(!/plainPassword|"password"|\$2[aby]\$/.test(text), path);
  }
  // Re-requesting an existing account does not reveal credentials.
  const again = await req("/api/auth/students/account", {
    token: tokens.employee,
    body: { studentId: accounts.a.student._id, name: "Ahmed Ali" },
  });
  assert.strictEqual((await again.json()).password, null);
});

test("password reset: admin only, one-time, old password stops working", async () => {
  const userId = accounts.b.account._id;
  assert.strictEqual((await req(`/api/auth/students/${userId}/reset-password`, { token: tokens.employee, method: "POST" })).status, 403);
  assert.strictEqual((await req(`/api/auth/students/${userId}/reset-password`, { token: tokens.studentA, method: "POST" })).status, 403);
  const res = await req(`/api/auth/students/${userId}/reset-password`, { token: tokens.admin, method: "POST" });
  assert.strictEqual(res.status, 200);
  const { password } = await res.json();
  assert.ok(password && password !== accounts.b.account.password);
  assert.strictEqual((await login(accounts.b.account.email, accounts.b.account.password)).status, 401);
  assert.strictEqual((await login(accounts.b.account.email, password)).status, 200);
  // Admin accounts cannot be reset through the student endpoint.
  const admin = await UserModel.findOne({ role: "admin" });
  assert.strictEqual((await req(`/api/auth/students/${admin._id}/reset-password`, { token: tokens.admin, method: "POST" })).status, 404);
});

test("students only see their own records", async () => {
  assert.strictEqual((await req(`/api/progress/dashboard/${accounts.a.student._id}`, { token: tokens.studentA })).status, 200);
  assert.strictEqual((await req(`/api/progress/dashboard/${accounts.b.student._id}`, { token: tokens.studentA })).status, 403);
  assert.strictEqual((await req(`/api/students/${accounts.b.student._id}`, { token: tokens.studentA })).status, 403);
  assert.strictEqual((await req(`/api/students`, { token: tokens.studentA })).status, 403);
});

test("students never receive exam answer keys", async () => {
  const exam = await ExamModel.create({
    title: "Quiz", academicYear: "الصف الاول", group: new mongoose.Types.ObjectId(), date: new Date(), startTime: "10:00", durationMins: 30,
  });
  await QuestionModel.create({ exam: exam._id, text: "2+2?", type: "mcq", options: ["3", "4"], correctAnswer: "4" });
  const studentView = await (await req(`/api/exams/${exam._id}/questions`, { token: tokens.studentA })).json();
  assert.strictEqual(studentView.length, 1);
  assert.strictEqual(studentView[0].correctAnswer, undefined);
  const staffView = await (await req(`/api/exams/${exam._id}/questions`, { token: tokens.employee })).json();
  assert.strictEqual(staffView[0].correctAnswer, "4");
});
