// Runs once, only when the MongoDB data volume is empty (first start).
// Creates a least-privilege user for the academy database. Values come from the
// container environment (see docker-compose.yml); nothing is hardcoded.
const dbName = process.env.MONGO_APP_DB;
const user = process.env.MONGO_APP_USER;
const pwd = process.env.MONGO_APP_PASSWORD;

if (!dbName || !user || !pwd) {
  throw new Error("MONGO_APP_DB, MONGO_APP_USER and MONGO_APP_PASSWORD must be set");
}

db.getSiblingDB(dbName).createUser({
  user,
  pwd,
  roles: [{ role: "readWrite", db: dbName }],
});
print(`Created application user for database ${dbName}`);
