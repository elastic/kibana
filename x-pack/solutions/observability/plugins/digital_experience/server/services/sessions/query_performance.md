# Session summaries: query performance

What the session summaries task costs Elasticsearch, what was measured to get there, and what was
tried and dropped. The design itself is in the plugin README ("Sessions" and "Summary query"); the
queries are in `summary_queries.ts` and the loop in `summarize_sessions.ts`.

## Measuring a change

- **Same rows first.** Run the old and the new query on the same session ids and compare every
  column of every row. Several rewrites below were faster and wrong.
- **Ids like the task's.** The task rebuilds sessions that just had an event, so take the ids of a
  recent window (`changedSessionIdsQuery`), at most 5,000 per query (`SESSIONS_PER_QUERY`). Ids
  spread over a whole day made the `FORK` rewrite look more than twice as good on one layout.
- **Alternate the variants** and take medians of `took`, with `profile: true` for data-node CPU.
  A window wider than 5,000 ids is sampled to 5,000: ES|QL refuses statements over 1M characters,
  about 25,000 ids.
- **Task runs** are in the Task Manager event log: `.kibana-event-log-*`, `event.action: task-run`,
  `kibana.task.id: digital_experience:sessions-summaries`, `event.duration` in nanoseconds.

## Where the time goes

One summary query on a 5 minute window (3,881 sessions, 155,000 events, a single 2 GB Elastic Cloud
node), before the web vitals got their own branch:

| Part | Share |
| --- | --- |
| Per-event `EVAL`s on the data node | 55% |
| Loading field values | 24% |
| Finding the events (the `IN` terms lookup) | 14% |
| Coordinator `EVAL` (cleaning attributes) | 7% |

Taking parts out of the query one at a time: the web vitals were about 29% of it (their
`PERCENTILE`s about 8%, `TO_LOWER` about 4%), the 31 `LAST()` attribute columns about 17%, the
`seen_*` checks about 9%, and the rest (filter, grouping, counts, journey) about 45%. The time
range doesn't matter: the `session.id` lookup decides which events are read, and 2 to 24 hours of
lookback took the same time. Fetching the changed ids takes 3% to 12% of a window's query time.

## Current numbers

The vitals branch against the query before it, on a single 2 GB Elastic Cloud node (844 MB heap)
with 24 hours of synthtrace EDOT Browser data (about 1.08M events), medians of 7 runs (5 for 24 h),
identical rows:

| Window | Sessions per query | Before | Vitals branch |
| --- | --- | --- | --- |
| 1 min | 1,150 | 193 ms | 156 ms (−19%) |
| 5 min | 3,881 | 525 ms | 392 ms (−25%) |
| 1 h | 5,000 of 6,509 | 680 ms | 499 ms (−27%) |
| 24 h | 5,000 of 33,541 | 748 ms | 510 ms (−32%) |

The same deployment ran the task at:

| Load | Sessions per run | Task run |
| --- | --- | --- |
| First rebuild of 24 h | 28,104 | 12.0 s |
| Live, synthtrace scale 1 | about 30 | 0.17–0.24 s |
| Live, synthtrace scale 40 | 1,150–1,240 | 0.53–0.61 s, node at 5% CPU |

## History

Synthtrace EDOT Browser data throughout unless said otherwise. "Nx" is the synthtrace scale of a
load test.

### Why summaries at all (October to November 2026)

- **Prototype:** listing 1,200 sessions from raw events with `top_hits(100)` took 330 ms, against
  9 ms without it, and capped the list at about 264 sessions. A 7 day list took 2 ms from a summary
  index against 454 ms raw. A summary costs about 373 bytes.
- **Read side under load** (8 vCPU, 16 GB, one app, 30 days: 53.6M events, 1.14M sessions):

  | Range | Raw, 1 viewer | Summaries, 1 viewer | Raw, 100 viewers p50 | Summaries, 100 viewers p50 |
  | --- | --- | --- | --- | --- |
  | 1 h | 43 ms | 11 ms | 425 ms | 52 ms |
  | 24 h | 724 ms | 9 ms | 5.8 s | 116 ms |
  | 7 d | 3.7 s | 39 ms | 76 s | 720 ms |
  | 30 d | 12.6 s | 204 ms | about 7.5 min | 3.2 s |

  The whole Sessions page from raw events (list, KPIs and facets in one `FORK`) took 45 s at 30
  days and tripped the circuit breaker with 10 viewers. `FORK` reads its source once per branch:
  [elasticsearch#165553](https://github.com/elastic/elasticsearch/issues/165553).
- **Transform** (the first implementation, since removed in
  [#305009](https://github.com/elastic/kibana/pull/305009)): one partition summarized about 25,000
  to 28,000 events a second whatever the hardware; 16 partitions on two 16 vCPU nodes caught up
  1.47M sessions in 83 s. Under live load, ingest saturated the nodes' CPU before the transform
  did.

### The ES|QL loop (November 11, 2026)

On one 8 vCPU node with 5 hours at about 3M sessions a day (29.4M events, 625,000 sessions, about
23,000 changed sessions a minute), each variant as one sequential worker:

| | Transform | ES\|QL, literal `IN` | ES\|QL, `IN (subquery)` |
| --- | --- | --- | --- |
| Backfill of 625,000 sessions | 295 s | 99–126 s | |
| One minute of changes | 7.2–9.6 s | 2.1–2.7 s | 19–21 s |
| ES CPU per 1,000 sessions, one minute | 0.31–0.54 s | 0.14–0.21 s | 1.6–1.9 s |

- **Literal ids, not a subquery.** The subquery read 7.39M events where the literal list read
  576,000: its hash join only kicks in under 100 ids
  ([elasticsearch#165551](https://github.com/elastic/elasticsearch/issues/165551)). With the
  threshold at 10,000, 5,000 ids read 100,000 rows in 115 ms instead of 2.05M in 0.9 s.
- **[elasticsearch#165616](https://github.com/elastic/elasticsearch/pull/165616)** pushes the
  subquery down: 5,000 ids went from 194 ms to 14 ms (16 ms as literals), and a minute's rounds
  from 22–27 s to 1.7–2.3 s, on par with literals (2.0–2.5 s). The task still uses literals: a
  subquery re-aggregates the window for every batch, about 14 s at 75x against 0.6 s for one id
  fetch, and the lookup it would save is at most 3% to 12% of a window.
- **Journey with `TOP`'s output field** rather than sorting a `CONCAT` string: one minute's
  rounds went from 1.8–2.6 s to 1.6–1.9 s.

### The Task Manager task under load (November 11 to 16, 2026)

[#304848](https://github.com/elastic/kibana/pull/304848). Locally, a 5,000 session batch took
600 ms of ES|QL: a 207 KB query and a 2.7 MB, 46 column response.

On Elastic Cloud, one node, 2 GB Kibana:

| Load | Node | New sessions a minute | Run p50 / max | ES CPU avg |
| --- | --- | --- | --- | --- |
| 1 generator, scale 20 | 844 MB heap | 326 | 0.6 / 1.2 s | 2% |
| 6 generators | 844 MB heap | 6,556 | 5.1 / 6.3 s | 15% |
| 20x | 8 GB heap | 20,809 | 14.3 / 16.8 s | 35% |
| 30x | 8 GB heap | 39,844 | 22.8 / 28.2 s | 57% |
| 50x | 8 GB heap | 43,000–51,000 | 78 / 121 s, falling behind | 98–100% |

- **Event loop:** turning a 5,000 row response into summaries blocked Kibana for up to 495 ms at
  6x. Batches of 2,000 or 1,000 cut that but added 6% and 14% Elasticsearch time; mapping 500 rows
  per tick of the same 5,000 batch got it to 10 ms locally (138 ms worst on cloud). Adopted.
- **Changed ids, 75x on one 16 vCPU node:** 44 id queries of about 0.95 s took 41 s of a run,
  against 15 s for the 9 summary queries. Bucketing the ids by a SHA-256 prefix with `VALUES()`
  fetched 137,567 ids in one query and about 0.6 s instead of 28 queries and 13.4 s. Adopted
  (`IDS_PER_QUERY`).
- **Attributes cleaned once per session:** per-event `EVAL`s were about 40% of the summary query,
  field loading 39% and the terms lookup 21%. Cleaning the 30-odd attribute fields after the
  aggregation instead of on every event took 22% off, with identical rows. Adopted.
- **Concurrency**, all three fixes, on one 32 vCPU node:

  | | 16 vCPU, one query at a time, 75x | 32 vCPU, concurrency 2 |
  | --- | --- | --- |
  | New sessions a minute | about 60,800 | 73,649 (about 106M a day) |
  | Run p50 / max | 90 / 135 s, falling behind | 25.7 / 37.3 s |
  | ES CPU avg | 81% | 41% |

  At 100x (about 100,000 new sessions a minute) runs took 45.4 s p50, 53.0 s max. Changed sessions
  are about 2.2 times the new ones. Adopted as `concurrency`, default 2.
- **Two 64 GB nodes, 300,000 changed sessions a minute** (150x short sessions plus long ones of 15
  to 40 page views): concurrency 2 ran 105.6 s p50, 4 ran 76.6 s at the same CPU. 40,000 long
  sessions cost as much as 260,000 short ones. Hence a maximum of 4, and Task Manager cost tiers
  of about 50 MB per query in flight.
- **Arrow instead of JSON** responses: 951 against 984 ms in Elasticsearch, but 78 against 47 ms
  of Kibana work. Rejected.

### Data partitioning (November 12 to 18, 2026)

The summary query matches few documents spread over large segments, and ES|QL's default
`SEGMENT` partitioning hands a whole segment to one driver. On one 32 vCPU node, the
`data_partitioning: doc` pragma ran a batch in 0.54–0.68 s instead of 1.53–2.03 s, for about 1.5
times the CPU ([elasticsearch#161266](https://github.com/elastic/elasticsearch/issues/161266)).
[elasticsearch#165726](https://github.com/elastic/elasticsearch/pull/165726) picks `DOC` for such
queries: task runs at 100x went from 45 s to 31–33 s p50, with the ES|QL breaker peak rising from
about 70 to 160–190 MB; 150x then fell behind (runs from 48 to 102 s). It is now opt-in, with
`SET doc_partitioning_for_wide_rows = true`. On the small Elastic Cloud node it made no difference.

### The `FORK` query (November 18, 2026)

[#306078](https://github.com/elastic/kibana/pull/306078),
[#306059](https://github.com/elastic/kibana/issues/306059). Grouping every aggregation by page URL,
then merging per session, was the main cost; the journey became a second branch reading only page
views.

Locally, 12.1M events over 24 h, 5,000 ids spread over the day, 20 alternating runs:

| Segment layout | Before | `FORK` | Change |
| --- | --- | --- | --- |
| By host, then time (`generic`) | about 250 ms, 583 ms CPU | about 180 ms, 486 ms CPU | −25% to −30%, CPU −16% |
| By service, session, time (`browser`) | about 200 ms, 464 ms CPU | about 147 ms, 360 ms CPU | −27%, CPU −22% |

On ids of the latest hour, as the task picks them, the gain was smaller: −11% (CPU −15%) on
`generic` and −25% (CPU −22%) on `browser`. Elsewhere, on 5,000 sessions with identical rows:

| Cluster | Before | `FORK` | Change |
| --- | --- | --- | --- |
| Serverless, recent sessions | 1,734 ms, 951 ms CPU | 1,105 ms, 727 ms CPU | −36%, CPU −24% |
| Elastic Cloud, 2 GB node | 1,161 ms | 892 ms | −23%, CPU −18% |
| Same, live 1 / 2 / 5 min windows | 263 / 388 / 648 ms | 205 / 294 / 500 ms | −22% to −24% |

Writing a batch in one bulk request instead of bulks of 2,000: on serverless each bulk waits about
0.15 to 0.4 s for durability, so 8,000 summaries took 1.4 s in one bulk against 2.3 s in four.

### Web vitals in their own branch (November 19, 2026)

The five vital `CASE`s, five `PERCENTILE`s and 15 counts ran on every event, though only about 7%
of events are web vitals. A third branch reads only those: −19% to −32% (see
[Current numbers](#current-numbers)). A session without a vital has no row there, so its counts are
`COALESCE`d to 0 after the merge.

## Tried and dropped

On the 5 minute window of the Elastic Cloud node, against the `FORK` query, identical rows unless
said otherwise:

| Rewrite | Change | Why dropped |
| --- | --- | --- |
| Attributes in a fourth branch | −13% alone, −10% with the vitals branch | Each branch is its own Lucene scan of the 5,000 ids, and resource attributes are on almost every event |
| `TO_LOWER` of the vital name in its own `EVAL` | −3% | Redundant with the vitals branch |
| `SUM` of 0 and 1 instead of `COUNT(*) WHERE` | +6% | Slower |
| No `COALESCE` of `event_name` and `name` | −1% | Noise |
| Final `EVAL` trimming each value once, with a plain `COALESCE` | 0% | The coordinator `EVAL` is about 20 ms |
| No `COALESCE(…, false)` around comparisons | +2% | Noise |
| No redundant `IS NOT NULL` and `!= ""` filters | −2% | Noise |
| Coalescing a group's fields per event, before the aggregation | −5% to −9% | Not equivalent: 2% to 5% of sessions differed |
| Smaller batches (2,000, 1,000) | +6%, +14% | Chunked mapping fixed the event loop instead |
| `IN (subquery)` for the changed ids | see above | Re-aggregates the window per batch |
| Shorter lookback (2 to 12 h instead of 24 h) | 0% | The id lookup decides what is read |

Not measured yet: one `STATS` grouped by a page URL that is only set on page views, dropping the
`FORK` (estimated 5% to 15%, with the latest attributes harder to keep exact).

## In Elasticsearch

Reading the ES|QL code along the query's hot paths found these, none filed yet. They would help
without rewriting the query, but after the vitals branch each is worth a few percent at most:

- `CASE(condition, value, null)` copies its result one position at a time; it could keep the
  value block with a mask (`Block.keepMask`). The query has four of these per event.
- `LAST(value, sort)` checks every row, including those whose sort value is null, which is most of
  them for sparse attributes: 31 columns, about 17% of the query.
- A grouped `COUNT(*) WHERE` doesn't skip a page whose filter is false on every row, as the
  ungrouped one does.
- A lazy `CASE` or `COALESCE` filters every column of the page, not just those its arms read.
- Sharing the source of `FORK` branches
  ([elasticsearch#165553](https://github.com/elastic/elasticsearch/issues/165553)) would make more
  branches cheap, e.g. the attributes branch above.
