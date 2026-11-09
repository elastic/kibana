# Installing the global managed workflows at start-up

AlertZero installs its global managed workflows when Kibana starts (`initializeManagedWorkflows`), with one `installMany` call. This page explains why and what to keep in mind if you change it.

## Rules

- Install the global set with one `installMany` call, not with `install` per workflow, whether in parallel or in a loop. Installing them one request each delays logins on a brand-new project.
- `installMany` only takes static workflows. Workers and other per-space workflows are dynamic and keep using `install`.
- A static workflow cannot set `settings.run_as`. A service-account binding needs a user request, and static workflows install without one. The managed workflow registry test fails if a static definition sets it.
- Any workflow install made inside a user request is still one write with `refresh: true`.

## Why it matters

Writes to system indices run on one small Elasticsearch thread pool, `system_write` (half the CPUs, at most 5 threads). `.workflows-*` and `.kibana_*` are system indices, so workflow writes, login sessions, saved objects and Task Manager all share that pool.

A write with `refresh: true` keeps its thread until the shard is refreshed (a flush on serverless), and refreshes of the same shard take turns. With 36 installs at once every thread waits, and a login's session write queues behind them. The fresh-project login probe in staging hit exactly this: first logins went from under 0.4 s to 1 to 4 s.

## What `installMany` does

- One search reads the stored documents of every workflow in the batch. Unchanged workflows are skipped, so a restart with nothing to change costs that one search.
- Missing and changed workflows are written with `_bulk`: at most 50 documents or 2 MB per request, one request at a time, each with `refresh: true`.
- Each request goes to the index's one shard, so the install holds at most one `system_write` thread and pays one refresh per request instead of one per workflow.
- When another Kibana node writes the same workflow first, the conflicting workflows are read again and skipped if they are already up to date.

Measured for [security-team#20771](https://github.com/elastic/security-team/issues/20771) with 200 workflows against a bare stateful Elasticsearch 9.7.0. Each cell is the install time, then the slowest login session write during it:

| | 5 `system_write` threads | 1 thread |
|---|---|---|
| One request per workflow, 4 at a time (before) | 9.9 s / 42 ms | 16.6 s / 456 ms |
| `_bulk`, 50 per request | 0.8 s / 27 ms | 1.1 s / 130 ms |

## Why not `refresh: 'wait_for'`

Each write would wait for the next scheduled refresh: 1 s on stateful and 5 s on serverless, where the workflow index isn't fast-refresh. A concurrency limit of 4 with `wait_for` took 45.6 s for 36 workflows on a local serverless Elasticsearch.

## How to check a change

- Boot a fresh Elasticsearch and Kibana with `xpack.alertzero.enabled: true`, and log in every 200 ms from the moment Kibana answers. The worst login in the first ~25 s is the number to watch. With all 36 installs at once it was 3.5 to 4 s locally.
- Poll `GET _cat/thread_pool/system_write?v&h=active,queue` every 200 ms during the boot. A stall shows `active` at the pool size and a growing `queue`.
- Check the install time in the Kibana log (`AlertZero managed workflows initialized`).
- Stateful numbers do not predict serverless. Test on serverless, or on a local serverless Elasticsearch, before changing refresh behavior.

## Open ideas

- Install the global workflows when the first worker is enabled instead of at start-up. This needs the global set to become `dynamic`, which moves it off `installMany`.
- Measure `installMany` on serverless, where each request's `refresh: true` is a flush.

## References

- Investigation: https://github.com/elastic/security-team/issues/20744
- `_bulk` install: https://github.com/elastic/security-team/issues/20771
- Earlier batching change (4 at a time): https://github.com/elastic/kibana/pull/303589
- `wait_for` change (on hold): https://github.com/elastic/kibana/pull/303628
