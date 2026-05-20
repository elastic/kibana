# Logs Extraction Pagination

Three nested loops process raw log documents into aggregated entity rows.

**Window cap outer loop**: When the gap between `fromDateISO` and the effective window end (`now - delay`) exceeds `maxTimeWindowSize + GRACE_PERIOD` (default `15m + 30s`), the run processes the time range as a sequence of capped `[fromSub, toSub]` sub-windows of width `maxTimeWindowSize`, advancing within a single execution until the effective end is reached. Sub-windows are an in-memory iteration concept — the saved-object schema is unaware of them. Crash recovery uses the per-slice persistence emitted by the inner outer-loop (last `paginationTimestamp` / `checkpointTimestamp` written). Manual `specificWindow` / `windowOverride` runs bypass capping and run as a single pass.

**Outer loop — log slices**: Each iteration runs a **boundary probe** (`buildLogPaginationCursorProbeEsql`) to locate the inclusive end of the next raw-log slice (up to `maxLogsPerPage` documents, sorted by `@timestamp ASC`). The probe returns `total_logs` (count before `LIMIT`) so the client knows when the window is exhausted.

**Inner loop — entity pages**: Each log slice is processed via `buildLogsExtractionEsqlQuery`. Results are paginated by `(FirstSeenLogInPage, UntypedId)` up to `docsLimit` entities per query.

---

## Cursors

| Cursor | Persisted fields | Semantics |
|--------|-----------------|-----------|
| **Log slice start** | `logsPageCursorStartTimestamp` | Inclusive lower bound `@timestamp` for the next probe. Set to the previous slice end after completing all entity pages. Doubles as the resume point on crash mid-run — no separate sub-window checkpoint is persisted. |
| **Log slice end** | `logsPageCursorEndTimestamp` | Inclusive upper bound for the current slice. Set by the probe; cleared when the slice is fully processed. |
| **Entity cursor** | `paginationTimestamp/Id` | `(FirstSeenLogInPage, UntypedId)` of the last ingested entity page. Cleared when a slice finishes. |

`logsPageCursorStart` is a **timestamp-only** inclusive lower bound applied as:
```
@timestamp >= TO_DATETIME("T")
```

The base time-window filter also uses `@timestamp >= fromDateISO` (inclusive). `logsPageCursorStart` adds a tighter bound narrowing to the next unprocessed slice.

The boundary is inclusive, which means the slice-end document is re-processed on the next iteration. This is safe because all aggregations (`TOP`, `LAST`, `MIN`, `MV_UNION`) are idempotent.

---

## Happy path: single log page, single entity page

All logs fit in one slice; all entities fit in one page.

```mermaid
sequenceDiagram
    participant C as Client
    participant ES as Elasticsearch
    C->>ES: probe(from ≤ @ts ≤ to) → end=T1, total≤maxLogs
    Note over C: isLastPage=true, no further probe needed
    C->>ES: extract(from ≤ @ts ≤ T1) → N entities
    C->>ES: ingest(entities)
    Note over C: done — clear all state, set lastExecutionTimestamp=to
```

---

## Happy path: multiple log pages, one entity page each

Logs exceed `maxLogsPerPage`. Each slice produces fewer than `docsLimit` entities.

```mermaid
sequenceDiagram
    participant C as Client
    participant ES as Elasticsearch

    C->>ES: probe(from ≤ @ts ≤ to) → end=T1, total>maxLogs
    C->>ES: extract(from ≤ @ts ≤ T1) → entities
    C->>ES: ingest
    Note over C: advance cursorStart=T1

    C->>ES: probe(@ts≥T1, @ts≤to) → end=T2, total≤maxLogs
    Note over C: isLastPage=true
    C->>ES: extract(@ts≥T1, @ts≤T2) → entities
    C->>ES: ingest
    Note over C: done
```

After each slice, `logsPageCursorStart` advances to the slice end (`@timestamp >= T`). The slice-end doc may be re-processed on the next probe, but aggregations are idempotent so this is safe.

---

## Happy path: multiple log pages, multiple entity pages

Entity count within a slice exceeds `docsLimit`, requiring inner iterations. State is persisted after each entity page in case of interruption.

```mermaid
sequenceDiagram
    participant C as Client
    participant ES as Elasticsearch

    C->>ES: probe(from ≤ @ts ≤ to) → end=T1, total>maxLogs

    loop inner — entity pages
        C->>ES: extract(@ts ≤ T1, entityCursor) → docsLimit entities
        C->>ES: ingest
        Note over C: persist: cursorEnd=T1, paginationTimestamp/Id=(Tp,Ep)
    end

    Note over C: slice done — advance cursorStart=T1, clear entity cursor
    C->>ES: probe(@ts≥T1, @ts≤to) → next slice...
```

If the process crashes mid inner-loop, `paginationId` is set in the saved state. The next run enters recovery (see below).

---

## Lagging environment: multiple sub-windows in one run

When `effectiveWindowEnd - fromDateISO > maxTimeWindowSize + GRACE_PERIOD`, the time range is processed as a sequence of capped sub-windows within a single `extractLogs` run. Each sub-window runs the existing slice/entity loops to completion. Persistence between sub-windows is whatever the inner outer-loop already wrote (per-slice `paginationTimestamp`); no extra checkpoint round-trip is added.

```mermaid
sequenceDiagram
    participant C as Client
    participant ES as Elasticsearch
    Note over C: fromDateISO=T0, effectiveEnd=T0+15m, cap=5m

    rect rgb(240, 240, 240)
    Note over C: sub-window 1: [T0, T0+5m]
    C->>ES: probe → slice end, then extract + ingest entities
    Note over C: per-slice persistence: paginationTimestamp = lastSliceEnd_ts
    end

    rect rgb(240, 240, 240)
    Note over C: sub-window 2: [T0+5m, T0+10m] (in-memory advance)
    C->>ES: probe → slice end, then extract + ingest entities
    end

    rect rgb(240, 240, 240)
    Note over C: sub-window 3: [T0+10m, T0+15m] (effective end — not capped)
    C->>ES: probe → slice end, then extract + ingest entities
    end

    Note over C: final cleanup: clear all cursors, set lastExecutionTimestamp = T0+15m
```

If the process is aborted between sub-windows, recovery resumes from the last persisted slice end (`paginationTimestamp` set by the inner outer-loop after the most recently completed slice) — not from a sub-window boundary. The next run re-establishes its own sub-window cap from that resume point.

---

## Recovery

A crash mid-entity-page leaves the following state on disk:

| Field | Value | Meaning |
|-------|-------|---------|
| `paginationTimestamp` | `T_ent` | `MIN(@timestamp)` of logs in the last processed entity page |
| `paginationId` | `E_ent` | untyped ID of the last ingested entity |
| `logsPageCursorEndTimestamp` | `T_end` | inclusive upper bound of the interrupted slice |
| `logsPageCursorStartTimestamp` | `T_start` | inclusive lower bound of the interrupted slice |

On the next run `fromDateISO = T_ent` and `recoveryId = E_ent`.

```mermaid
sequenceDiagram
    participant C as Client (recovery)
    participant ES as Elasticsearch

    Note over C: fromDateISO=T_ent, recoveryId=E_ent
    Note over C: first iteration — cursorStart ignored, probe re-establishes slice from T_ent

    C->>ES: probe(@ts ≥ T_ent, @ts ≤ to) → new end=T1
    Note over C: entity pagination starts strictly after (T_ent, E_ent)

    loop remaining entity pages
        C->>ES: extract(@ts ≥ T_ent, @ts ≤ T1, entityCursor after (T_ent,E_ent))
        C->>ES: ingest
    end

    Note over C: recoveryId cleared — continues as normal from cursorStart=T1
```

The entity-level pagination WHERE uses `> T_ent OR (= T_ent AND untypedId > E_ent)` — entities already ingested before the crash are skipped; the slice is re-established from `T_ent` inclusive.

A crash *between* sub-windows is indistinguishable from a crash at a slice boundary: the most recently persisted state is `paginationTimestamp = lastSliceEnd_ts` (from the inner outer-loop's per-slice `advanceEngineStateAfterLogPageCompletes`). The next run reads that as `fromDateISO` and re-establishes the sub-window cap from there — re-fetching the slice-boundary doc itself, which is harmless under the idempotent aggregations (`TOP`, `LAST`, `MIN`, `MV_UNION`).

---

## Edge cases

### Cap interaction with `specificWindow` / `windowOverride`

When a manual window is supplied (admin-triggered API call), the sub-window cap is bypassed and the supplied bounds are processed in a single pass via the existing slice/entity loops. State is not advanced — the user explicitly picked the bounds, and we do not silently shorten or shift them.

### Timestamp collision at a slice boundary

The log-slice cursor is timestamp-only (`@timestamp >= T`). Documents sharing the same millisecond are processed in undefined order, and the slice boundary is inclusive so the slice-end document is re-processed on the next iteration. Re-processing is safe because all aggregations (`TOP`, `LAST`, `MIN`, `MV_UNION`) are idempotent.

**Timestamp stall detection**: If more than `maxLogsPerPage` documents share a single millisecond, successive slices would all end at the same timestamp and the outer loop would make no progress. The client detects this condition (same slice-end timestamp as the previous slice start, full page) and bumps the cursor forward by 1ms, emitting a `warn` log. Documents at the surplus millisecond beyond `maxLogsPerPage` are dropped.

```mermaid
sequenceDiagram
    participant C as Client
    participant ES as Elasticsearch

    Note over C: sliceStart=T (from previous iteration)
    C->>ES: probe(@ts≥T) → end=T again (same ms!), total=maxLogsPerPage
    Note over C: stall detected — bump cursor to T+1ms, log warn
    C->>ES: extract(@ts≥T, @ts≤T) → entities (re-processes T docs, idempotent)
    Note over C: sliceStart = T+1ms — advances past the congested millisecond
```

### Exact full page (`total_logs == maxLogsPerPage`)

When the probe returns `total_logs == maxLogsPerPage` the slice is marked `isLastPage = true` and no further probe is issued. This is correct: `total_logs` is the `INLINE STATS count(*)` computed before the `LIMIT`, so an exactly full count means the window is exhausted by this slice.

The inclusive boundary means the slice-end document is re-processed on the following slice when the loop advances. This is harmless under idempotent aggregations.

---

## Volume cap

Two independent knobs bound how much work a single run does:

| Knob | Purpose |
|------|---------|
| `maxLogsPerPage` | Upper bound on raw log docs in **one slice** (probe `LIMIT`). |
| `maxLogsPerWindow` | Upper bound on raw log docs across **the entire run**. 0 = disabled. |

### Why logs, not entities

`maxLogsPerWindow` caps **raw log documents scanned**, not entity rows produced. Entities are aggregated outputs (one entity per unique `entity.id`) and can be far fewer than the logs they summarise. Capping on entities would allow unbounded log scanning, which is what operators want to prevent.

### How the cap is computed

After each probe the slice's log count is derived and accumulated:

```
sliceLogCount = min(probe.total_logs, maxLogsPerPage)
totalLogs    += sliceLogCount   // runs across all slices in the window
```

The cap fires **after** the slice's entity pages are ingested and state is persisted:

```
if maxLogsPerWindow > 0 && totalLogs >= maxLogsPerWindow:
    logsCapApplied = true
    break
```

This ensures every slice that starts is fully processed before stopping.

```mermaid
sequenceDiagram
    participant C as Client
    participant ES as Elasticsearch

    C->>ES: probe → total_logs=5, sliceEnd=(T1,id1)
    Note over C: sliceLogCount=min(5,maxLogsPerPage), totalLogs+=sliceLogCount
    C->>ES: extract slice → entities
    C->>ES: ingest + persist cursor
    Note over C: totalLogs >= maxLogsPerWindow? → cap fires, break

    alt maxLogsPerWindowCapBehavior = defer
        Note over C: lastSearchTimestamp = T1 (resume point)
    else maxLogsPerWindowCapBehavior = drop
        Note over C: lastSearchTimestamp = toDateISO (skip remainder)
    end
```

### Across sub-windows (lagging environments)

When the time range is split into sub-windows (see [Lagging environment](#lagging-environment-multiple-sub-windows-in-one-run)), the remaining budget shrinks across sub-windows:

```
remainingCap = maxLogsPerWindow - totalLogsAcrossSubWindows
```

Each sub-window receives `remainingCap` as its own `maxLogsPerWindow`. The cap fires in the first sub-window that exhausts the budget.

### Defer vs drop on cap

| `maxLogsPerWindowCapBehavior` | `lastSearchTimestamp` returned | Next run behaviour |
|---|---|---|
| `defer` | Slice end where cap fired | Resumes from cursor; processes remaining logs |
| `drop` | `toDateISO` (window end) | Cursor advances past uncapped logs; they are skipped |

### Disabling the cap

`maxLogsPerWindow = 0` disables the cap entirely — the per-slice check is skipped and the run processes all logs in the window.
