# Installing the global managed workflows at start-up

AlertZero installs its global managed workflows when Kibana starts (`initializeManagedWorkflows`). This page explains why that install is batched and what to keep in mind if you change it.

## Rules

- Keep the install bounded (`GLOBAL_WORKFLOW_INSTALL_CONCURRENCY`). Starting all of them at once delays logins on a brand-new project by several seconds.
- Do not combine the bounded install with `refresh: 'wait_for'` on serverless unless `fast_refresh` is enabled on the workflow indices first. See "Why batching and `wait_for` do not combine" below.
- Any workflow install made inside a user request pays the same refresh cost as the start-up install.

## Why it matters

Writes to system indices run on one small Elasticsearch thread pool, `system_write` (half the CPUs, at most 5 threads). `.workflows-*` and `.kibana_*` are system indices, so workflow writes, login sessions, saved objects and Task Manager all share that pool.

A write with `refresh: true` keeps its thread until the shard is refreshed (a flush on serverless), and refreshes of the same shard take turns. With 36 installs at once every thread waits, and a login's session write queues behind them. The fresh-project login probe in staging hit exactly this: first logins went from under 0.4 s to 1 to 4 s.

Only fresh projects are affected. On later starts, unchanged workflows are skipped without a write.

## Why batching and `wait_for` do not combine

Install time is about the number of rounds times the time per round.

- Batching of 4 raises the rounds from 1 to 9.
- `wait_for` raises the time per round from about 0.4 s to the refresh interval, which is 5 s on serverless (1 s on stateful).
- Together: about 9 x 5 s = 46 s.

Local serverless Elasticsearch, one run per scenario:

| | `refresh: true` | `refresh: 'wait_for'` |
|---|---|---|
| 36 at once | Logins stall (573 ms), installs 1.2 s | Logins fine (247 ms), installs 5.5 s |
| 4 at a time | Logins fine (260 ms), installs 3.9 s | Logins fine (343 ms), installs 45.6 s |

Logins were already at baseline (221 to 276 ms) with either change alone.

## How to check a change

- Boot a fresh Elasticsearch and Kibana with `xpack.alertzero.enabled: true`, and log in every 200 ms from the moment Kibana answers. The worst login in the first ~25 s is the number to watch. Before batching it was 3.5 to 4 s locally.
- Poll `GET _cat/thread_pool/system_write?v&h=active,queue` every 200 ms during the boot. A stall shows `active` at the pool size and a growing `queue`.
- Check the install time in the Kibana log (`AlertZero managed workflows initialized`).
- Stateful numbers do not predict serverless. Test on serverless, or on a local serverless Elasticsearch, before changing refresh behavior.

## Open ideas

- Install the global workflows when the first worker is enabled instead of at start-up. This needs the global set to become `dynamic`, and the refresh behavior sorted out first, otherwise the burst moves onto a running cluster.
- Ask the Elasticsearch team to set `fast_refresh: true` on the workflow indices in serverless.

## References

- Investigation: https://github.com/elastic/security-team/issues/20744
- Batching change: https://github.com/elastic/kibana/pull/303589
- `wait_for` change (on hold): https://github.com/elastic/kibana/pull/303628
