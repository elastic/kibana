# Ingest freshness: operations and failure modes

The `sdlc-ingest-freshness` transform derives per-source `last_write` so alerts can
assert **document movement** rather than workflow exit status. Two real bugs
(org-members, project-items) reported `completed` while writing zero documents,
which a status-only rule structurally cannot see.

## Why the rebuild is a batch script, not a continuous transform

A continuous transform with `sync.time.field` only reprocesses buckets receiving
**new** data. A source that *stops* writing is never revisited - so the very
condition being alerted on is the one it cannot detect. `scripts/refresh_freshness.sh`
recomputes the whole table on a 15-minute schedule instead.

## Why the source list is explicit

A bare `github-intel-*` wildcard sweeps in derived and scratch indices. Concretely,
`github-intel-lookup-teams` is a lookup-mode projection whose `sync.source` is mapped
as `text`, so a `terms` aggregation throws *"Fielddata is disabled"* and the entire
transform goes `health: red` while still reporting `state: started`.

## The false green this created (2026-09-01)

`refresh_freshness.sh` fails **closed**: if a rebuild yields no documents it leaves
the previous table in place and exits non-zero. That is the right call - never serve
an empty table to the alert - but it means a permanently broken rebuild is invisible:

* the transform was `red` with 0 documents indexed and 7 search failures,
* the `vp-ingest-freshness` alias kept serving a snapshot frozen ~15 hours earlier,
* the stall alert read plausible data and never fired,
* the only outward symptom was a launchd job quietly exiting 1.

**A monitor that cannot detect its own death is not a monitor.**

## The watchdog

`scripts/vp_freshness_watchdog.sh` runs on the same 15-minute cadence and asserts:

1. transform `health` is `green` - `state` alone is not a health signal, it reads
   `started` while red,
2. the alias resolves to an index **created within the last 45 minutes** (three
   missed rebuilds), which is what catches a frozen table,
3. the table carries at least 15 sources.

Each assertion was mutation-tested: removing the alias and repointing it at an old
index both produce a non-zero exit, and the healthy state returns exit 0.

## Alert thresholds are per-source

Workflow schedules span `every: 30m` to `every: 1d`. A flat staleness threshold
either alerts permanently on the daily catalog workflows or is too slack to catch a
stalled 30-minute one. `sdlc-ingest-stalled` buckets sources at roughly 2.5x their
own interval.
