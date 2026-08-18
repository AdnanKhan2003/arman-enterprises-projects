# Archived migrations (pre-baseline)

These are the original migrations `0000`–`0004`, kept for reference only.
drizzle-kit ignores this folder entirely — it reads only `drizzle/meta/` for
snapshots and `drizzle/meta/_journal.json` for which files to run.

They were retired because they could not reproduce the live schema:

- `drizzle.__drizzle_migrations` was empty, so none of them had ever been
  applied through drizzle. The database was built by hand-run scripts instead.
- `0004_payments_redesign.sql` was never added to the journal, so replaying the
  journaled set (`0000`–`0003`) recreates `payments` in its old shape
  (`laborer_id`, `vendor_id`, `proof_url`) — which the current code cannot use.
- Snapshots stopped at `0003`, so drizzle-kit believed `payments` was still the
  old shape and the next `generate` would have emitted `DROP TABLE payments`.

The live schema is now described by a single baseline, `0000_baseline.sql`,
registered as already-applied so it never runs against the existing database.
Full per-commit history remains in git: `git log -p -- src/db/schema.ts`.
