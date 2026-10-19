// Security smoke tests against the compiled app (run `npm run build` first).
// No database connection is used; DB-dependent handlers are not exercised.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.CORS_ORIGINS = "https://academy.example.com";
process.env.RATE_LIMIT_AUTH_MAX = "3";
process.env.RATE_LIMIT_WHATSAPP_MAX = "2";
process.env.WHATSAPP_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

mongoose.set("bufferCommands", false);
const app = require("../dist/app").default;
const { signToken } = require("../dist/middleware/auth");

const studentId = "64b000000000000000000001";
const otherId = "64b000000000000000000002";
const tokens = {
  admin: signToken({ id: "64b0000000000000000000a1", role: "admin" }),
  employee: signToken({ id: "64b0000000000000000000e1", role: "employee" }),
  student: signToken({ id: "64b0000000000000000000s1".replace("s", "c"), role: "student", studentId }),
};

let base, server;
test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const req = (path, { token, ...init } = {}) =>
  fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });

test("health is public and has security headers", async () => {
  const res = await req("/api/health");
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers.get("x-content-type-options"));
  assert.strictEqual(res.headers.get("x-powered-by"), null);
});

test("protected routes require a token", async () => {
  for (const path of ["/api/students", "/api/payments", "/api/auth/users", "/api/whatsapp-status", "/api/whatsapp/messages"]) {
    assert.strictEqual((await req(path)).status, 401, path);
  }
  assert.strictEqual((await req("/api/test-whatsapp", { method: "POST", body: "{}" })).status, 401);
});

test("invalid and expired tokens are rejected", async () => {
  assert.strictEqual((await req("/api/students", { token: "garbage" })).status, 401);
  const expired = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { subject: "x", expiresIn: -10 });
  assert.strictEqual((await req("/api/students", { token: expired })).status, 401);
  const forged = jwt.sign({ role: "admin" }, "wrong-secret", { subject: "x" });
  assert.strictEqual((await req("/api/students", { token: forged })).status, 401);
});

test("role-based authorization", async () => {
  assert.strictEqual((await req("/api/students", { token: tokens.student })).status, 403);
  assert.strictEqual((await req("/api/payments", { token: tokens.student })).status, 403);
  assert.strictEqual((await req("/api/expenses", { token: tokens.employee })).status, 403);
  assert.strictEqual((await req("/api/auth/users", { token: tokens.employee })).status, 403);
  assert.strictEqual((await req("/api/test-whatsapp", { token: tokens.employee, method: "POST", body: "{}" })).status, 403);
});

test("students can only access their own records", async () => {
  assert.strictEqual((await req(`/api/progress/dashboard/${otherId}`, { token: tokens.student })).status, 403);
  assert.strictEqual((await req(`/api/students/${otherId}/exams`, { token: tokens.student })).status, 403);
  const submitOther = await req(`/api/exams/${otherId}/submit`, {
    token: tokens.student, method: "POST", body: JSON.stringify({ studentId: otherId, answers: [] }),
  });
  assert.strictEqual(submitOther.status, 403);
  // Own record passes authorization (fails later only because no DB is connected).
  assert.notStrictEqual((await req(`/api/progress/dashboard/${studentId}`, { token: tokens.student })).status, 403);
});

test("invalid ObjectId params return 400", async () => {
  assert.strictEqual((await req("/api/students/not-an-id", { token: tokens.admin })).status, 400);
});

test("Mongo operator injection is rejected", async () => {
  const res = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: { $ne: null }, password: { $ne: null } }) });
  assert.strictEqual(res.status, 400);
});

test("CORS only allows configured origins", async () => {
  const ok = await req("/api/health", { headers: { Origin: "https://academy.example.com" } });
  assert.strictEqual(ok.headers.get("access-control-allow-origin"), "https://academy.example.com");
  const bad = await req("/api/health", { headers: { Origin: "https://evil.example" } });
  assert.strictEqual(bad.headers.get("access-control-allow-origin"), null);
});

test("login is rate limited with a JSON 429", async () => {
  let last;
  for (let i = 0; i < 4; i++) {
    last = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "a@b.c", password: "x" }) });
  }
  assert.strictEqual(last.status, 429);
  assert.ok((await last.json()).message);
});

test("WhatsApp actions are rate limited per user", async () => {
  const send = () => req("/api/test-whatsapp", { token: tokens.admin, method: "POST", body: JSON.stringify({ phone: "201000000000" }) });
  assert.strictEqual((await send()).status, 200); // WhatsApp disabled: returns success:false, sends nothing
  await send();
  const limited = await send();
  assert.strictEqual(limited.status, 429);
  assert.ok((await limited.json()).message);
});

test("unknown errors return a generic message", async () => {
  const res = await req("/api/auth/login", { method: "POST", body: "{bad json" });
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(Object.keys(await res.json()), ["message"]);
});
