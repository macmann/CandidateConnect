# Storage today and Neon Postgres migration plan

## Current storage model

The platform currently uses a **file-based JSON repository pattern** under `lib/repositories/*Repository.ts`.

- Every repository reads/writes files from `process.cwd()/data/*.json`.
- IDs are generated with `crypto.randomUUID()`.
- There are no DB transactions/locking guarantees across files.
- Data is durable only if the `data/` directory persists between deployments.

### Where CV and related data is stored today

- Base CV text + notes live in `data/profile.json` via `profileRepository`.
- Generated/customized CV versions live in `data/documents.json` via `documentRepository`.
- Application-level selected CV version is linked by `cvDocumentVersionId` in `data/applications.json`.
- Submission snapshots keep immutable references to selected CV/cover versions in `data/submission-snapshots.json`.

## Current Neon cutover status

The repository now supports **Neon-backed persistence for profile + document repositories**.

- `profileRepository` reads/writes `profiles` when Neon SQL HTTP env vars are configured.
- `documentRepository` reads/writes `document_versions` and `application_documents` when configured.
- If Neon config is missing, both repositories automatically fall back to local JSON files.

This lets you migrate CV/profile paths first without breaking existing workflows.

## Recommended Neon architecture

Use Neon Postgres as the system of record for all repository-backed entities.

1. Configure SQL HTTP credentials (`NEON_SQL_ENDPOINT` + `NEON_SQL_API_KEY`).
2. Apply `db/neon-schema.sql`.
3. Migrate JSON data into Postgres with a one-time script.
4. Replace file-based repositories with SQL-backed repositories, one aggregate at a time:
   - profile/documents first (CV-critical path) ✅
   - applications + snapshots
   - interview rounds/interviewers/answers/activity/prep
5. Remove JSON fallback after full production validation.

## CV-specific migration notes

- Store full CV text in `document_versions.text` as `TEXT`.
- Keep CV version lineage with `(application_id, kind, version)` uniqueness.
- Map selected CV/Cover per application using `application_documents`.
- For immutable submission packs, write rows into `submission_snapshots` that reference exact CV/cover version IDs.

## Suggested environment variables

```bash
# JSON fallback stays active when these are not set
NEON_SQL_ENDPOINT=https://<your-neon-sql-http-endpoint>
NEON_SQL_API_KEY=<your-neon-sql-http-api-key>
```

## Rollout safety checklist

- Run dual-read checks in staging (JSON vs Postgres) for a subset of requests.
- Add backup job (Neon branching + periodic pg_dump).
- Validate post-migration counts per entity before enabling write traffic.
- Remove JSON write path once production parity is confirmed.
