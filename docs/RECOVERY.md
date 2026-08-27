# Recovery and Backup Provenance

## Supplied artifacts

| Artifact | SHA-256 | Repository destination |
|---|---|---|
| `app.tar.gz` | `579b2d628d4cce2bba8e81cb214e1bbfb8221bd442afcd813159cd1d613d735d` | Repository root after extraction |
| `snapshot_1787837890101793897.zip` | `95c112396f2dcdc798b227f976318cca7a26849c703509607f932fe2acd43997` | `backups/convex/2026-08-27/` after extraction |

The snapshot contains 11 table definitions and documents for `bridgeOrders`, `locations`, `menuItems`, and `users`; the remaining exported collections are currently empty. It includes identifying fields and therefore belongs only in a private repository with tightly controlled access.

## Restore principle

Treat `convex/schema.ts` as the intended application model and the dated snapshot as recovery data from a particular deployment state. Before any import, create a fresh export of the destination deployment, inspect import conflicts, and follow the current Convex import procedure. Never import this snapshot into a production deployment merely to test it.

## Future snapshots

Add each complete export under `backups/convex/YYYY-MM-DD/`, record its original archive hash here, and do not overwrite prior snapshots.
