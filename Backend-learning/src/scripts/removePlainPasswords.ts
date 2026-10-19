// One-time migration: removes the legacy `plainPassword` field from user documents.
// Login is unaffected: authentication always used the bcrypt hash in `password`.
//
// 1. Back up first:  mongodump --uri="$MONGO_URI" --out=backup-$(date +%F)
// 2. Dry run:        node dist/scripts/removePlainPasswords.js
// 3. Apply:          node dist/scripts/removePlainPasswords.js --apply
import mongoose from "mongoose";
import { env } from "../config/env";

async function run(): Promise<void> {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(env.mongoUri);
  const users = mongoose.connection.collection("users");
  const filter = { plainPassword: { $exists: true } };

  const count = await users.countDocuments(filter);
  console.log(`Database: ${mongoose.connection.name}. Users with plainPassword: ${count}`);

  if (apply && count > 0) {
    const result = await users.updateMany(filter, { $unset: { plainPassword: "" } });
    console.log(`Removed plainPassword from ${result.modifiedCount} user(s).`);
  } else if (!apply) {
    console.log("Dry run only. Re-run with --apply after taking a backup.");
  }
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error("Migration failed:", error?.message || error);
  process.exit(1);
});
