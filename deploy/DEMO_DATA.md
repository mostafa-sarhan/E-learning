# Academy – Demo Data (seed and cleanup)

These commands insert or remove one identifiable **demo batch** (default `academy-showcase-v1`).
They never run at startup, during Docker builds, on container restart or during deploys. They run
only when you execute them. Both are **dry runs by default**.

## What gets created (defaults)
| Kind | Count | Notes |
|---|---|---|
| groups | 20 | spread over all 6 grades, two weekly days each |
| sessions (schedule) | 40 | 2 per group |
| students | 200 | fictional Egyptian names, synthetic phones `00001…` / `00002…` (undeliverable) |
| student accounts | 200 | `demo.studentNNNN@example.com`; random unknown password (no one can log in until an admin resets it) |
| staff (employee) accounts | 15 | `demo.staffNNN@example.com`; random unknown password; no admins are created |
| lectures | 60 | 10 per grade; video ids from `DEMO_VIMEO_IDS` |
| exams | 30 | all in the past (none can be started); ~80% with published results |
| questions | 450 | 15 per exam; MCQ and true/false arithmetic with valid answers |
| exam results | 500 | students of the exam's grade; scored exactly like the app's `submitExam` |
| payments | 300 | one per student per month over the last 6 months; Arabic month names as the UI uses |
| expenses | 50 | rent, utilities, printing, … over the last 6 months |
| lesson progress | 600 | same-grade student/lecture pairs; `completed` exactly when 100% |
| attendance | 160 | each group's days over the last 4 weeks |

Courses/enrollments and WhatsApp logs are not seeded (not used by the UI / no messages were sent).
Override counts with `--counts students=120,exams=10,...` (keys: students, staff, groups, lectures,
exams, questionsPerExam, submissions, payments, expenses, progress, attendanceWeeks).

## Ownership and safety
- **Deterministic ids:** every demo `_id` is derived from `sha256(batch|kind|key)`. Reruns produce the same ids, so nothing is duplicated, and existing documents are never overwritten.
- **Registry:** `demo_records` lists every demo document (batch, kind, key, collection, id). The entry is written *before* the document, so an interrupted run never leaves an untracked record. `demo_batches` pins the counts and anchor date, so a resumed run regenerates identical data.
- **Cleanup** deletes a document only if it is in the registry **and** its `_id` matches the id derived for that batch. Before deleting anything, cleanup stops if:
  - any non-demo record references a demo record (for example, a real payment for a demo student);
  - a demo user was promoted to admin;
  - a registry entry fails the ownership check.

  Deletion is by explicit id lists, children first. It never uses `drop`, `dropDatabase` or an empty filter.
- **Apply guards:**
  - Requires `--confirm-db <name>`, which must equal the connected database, and the database must be in `DEMO_ALLOWED_DB_NAMES` (default `academy`).
  - Requires a **verified backup** (`--backup`) made by `deploy/backup.sh`. It must match the file name pattern, be at most 24 h old (`DEMO_BACKUP_MAX_AGE_HOURS`), have a matching `.sha256` and a complete gzip stream.
  - A lock (`demo_seed_locks`) prevents overlapping runs.
  - The seed refuses to run if any real student or user already uses a demo phone or email.
- **No external actions:** the scripts don't import messaging code. The WhatsApp sender also refuses
  synthetic numbers (`000…`), so staff actions on demo students (attendance, payments, results) can't message anyone.
- Connection strings and credentials are never printed.

## Visibility in production (decide before applying)
- The student portal filters exams and lectures **by grade**. Real students in the same grades will
  see the demo lectures, and the demo exams as finished. Set `--counts lectures=0,exams=0,submissions=0`
  (questions follow exams) if that's not acceptable.
- Lectures need real, embeddable Vimeo ids (`-e DEMO_VIMEO_IDS=id1,id2,...`). The placeholder doesn't play.
- Demo students appear in staff lists, reports and dashboard totals until cleanup.

## Local testing
```bash
cd Backend-learning
npm run build
node --test test/demo-seed.test.js      # isolated in-memory MongoDB; never touches a real database
```

## Production (Docker), from /opt/educational-academy
The scripts are compiled into the backend image (`dist/scripts/`); no ts-node or dev dependencies are needed.
Deploy the new image first (`git pull && docker compose build academy-backend && docker compose up -d`).

A one-off container (`docker compose run`) reuses the backend's environment and network. It runs
as your host user so it can read the backup directory, and it doesn't start the API or WhatsApp:
```bash
cd /opt/educational-academy
alias academy-run='docker compose run --rm --no-deps --user "$(id -u):$(id -g)" -v "$PWD/backups/mongo:/backups:ro" academy-backend'

# 1. Dry run (read-only): shows target DB, batch, counts, existing/planned records
academy-run node dist/scripts/seedDemo.js --confirm-db academy

# 2. Fresh verified backup, then a restore test of it (deploy/DEPLOYMENT.md §7)
./deploy/backup.sh
B=$(ls -1t backups/mongo/academy-mongo-*.archive.gz | head -1); echo "$B"
./deploy/restore-test.sh "$B"

# 3. Apply (optional: -e DEMO_VIMEO_IDS=111,222 after `run`, --counts ...)
academy-run node dist/scripts/seedDemo.js --apply --confirm-db academy --backup "/backups/$(basename "$B")"
```
**Repeat / resume:** run the same apply command again. Existing demo records are skipped, missing
ones are created, and counts are pinned by the batch manifest. If a run crashed and left a lock older than 2 h,
add `--release-stale-lock`.

## Removing the demo data
```bash
academy-run node dist/scripts/cleanupDemo.js --confirm-db academy      # dry run: counts + reference check
./deploy/backup.sh && B=$(ls -1t backups/mongo/academy-mongo-*.archive.gz | head -1)
academy-run node dist/scripts/cleanupDemo.js --apply --confirm-db academy --backup "/backups/$(basename "$B")"
```
If the dry run reports real records that reference demo records (for example, a real payment entered for a
demo student), resolve those manually first. The cleanup never guesses.
