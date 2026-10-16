# Significant Events detection engine

The detection engine described in `nightshift-program/workstreams/detection/design-decisions/2026-10-14-detection-engine-architecture.md`. Several detection strategies watch the customer's data and alerts, and one pipeline decides which of their findings become significant events. Code makes every decision it can compute; one bounded AI step checks evidence, rates severity and confirms or vetoes joins.

The plugin has no UI of its own. The **Detection engine** tab of `significant_events_app` reads and drives it through the internal API under `/internal/significant_events/detection_engine`, using the typed client in this plugin's browser start contract.

## How it runs

```
Alerting v2 signal rules ──► .rule-events ──┐
   (health checks, new log patterns,        │
    KI match counts)                        ├─► engine run, once a minute per space
Customer alerts (.alerts-*) ────────────────┘     │
                                                  ├─ baseline check, identity, dismissal hold
Managed workflow (every minute) ──► POST _tick ───┤  join proposals ─► Agent Builder agent
                                                  ├─ state machine, verifier
                                                  └─► .rule-events (Significant Events alerts)
```

1. **Strategies run on the platform.** Health checks, KI rules and new log patterns are Alerting v2 `signal` rules the engine creates and owns, one per strategy and source. Alerting v2 schedules them, retries them and runs them with an API key. The KI rule counts every match KI of the source per service and minute, promoted or not, with one `COUNT(*) WHERE` per KI; a KI whose query is more than `FROM <source> | WHERE ...` is listed as skipped. Customer alerts are read directly from `.alerts-*`, because classic alerts never reach `.rule-events`.
2. **A managed workflow runs the engine.** `system-significant-events-detection-engine-<space>` is installed per space when someone turns on Auto-run. Every minute it calls `POST _tick` with the API key of the person who turned it on. Its executions show in the Workflows app.
3. **Each run continues where the last one stopped.** Every strategy has a bookmark, the end of the last minute it evaluated. A run evaluates the minutes that settled since then: a rule's minute is settled once the rule has run after it. A run handles at most `maxBucketsPerRun` minutes per strategy. If the engine is more than `maxCatchUp` behind, it skips ahead and records how many minutes it skipped.
4. **One run per space at a time.** A run takes a lease in the state index with a version check, so the schedule, Run now and a backtest never overlap, even across Kibana nodes. A crashed run's lease expires.
5. **Minutes are walked in order.** For each minute: the baseline check, then identity, the dismissal hold, join proposals and the agent for each detection, strongest first. Then the state machine updates every open event. A member's health only moves when its own strategy evaluated that minute.
6. **Nothing is lost when budgets run out.** A detection that passed the baseline check but found no agent budget waits in a queue for the next run; past `maxPendingDetections`, or after five tries, it is dropped and recorded. A run stops starting new minutes once its time budget is spent.
7. **Writes are checked.** Events are written with version checks. When an operator changed an event during a run, the run's change is dropped, its detections are recorded as `conflict`, and the next run starts from the operator's version. Publishing to `.rule-events` happens after the write; a failed publication is retried by the next run.

## Where things are

| Piece | Where |
|---|---|
| Strategies and their rules | `server/lib/strategies/*`; rule reconciliation in `server/lib/rules/*` |
| Reading what rules wrote | `server/lib/strategies/rule_events_reader.ts` (point in time, row cap, latest row per bucket) |
| One run | `server/lib/engine/run_engine.ts`; its steps sit next to it (`plan_windows`, `evaluate_strategies`, `discovery_step`, `lifecycle_step`, `verifier_step`, `persist_step`) |
| Baseline check, state machine, join proposals | `server/lib/pipeline/*`, pure functions |
| Agent step | `server/lib/agent/*`: the Agent Builder agent type, its structured answer, the heuristic stand-in, validation in code |
| Storage | `server/lib/storage/*` |
| Schedule | `server/lib/scheduler/auto_run.ts`; the workflow itself is `src/platform/packages/shared/kbn-workflows/managed/definitions/significant_events/detection_engine.yaml` |
| API | `server/routes/*`; shared types in `common/` |

## Storage

Everything is written as the Kibana system user, filtered by space on every read, behind the Nightshift privileges on every route. Users need no access to the engine's hidden indices.

| What | Where | Kept |
|---|---|---|
| Every evaluation of every series, breaching or not | `.significant_events-detection_engine-observations` (data stream) | 3 days |
| Detections, with their baseline decision and outcome | `.significant_events-detection_engine-detections` (data stream) | 30 days |
| Activity log | `.significant_events-detection_engine-activity` (data stream) | 30 days |
| Run summaries | `.significant_events-detection_engine-runs` (data stream) | 14 days |
| Events, current state | `.significant_events-detection_engine-events` (index) | until reset |
| Settings, bookmarks, lease, cost, memory notes, owned rules, waiting detections | `.significant_events-detection_engine-state` (index) | until reset |

The engine keeps its own observations because Alerting v2 writes nothing for an evaluation that returns no rows. The baseline check needs those zeros, and the derived values (error ratio, drop in traffic) that rules do not compute.

## Settings

Per space, through `PUT config`: strategy modes and daily caps, the agent and its connector, baseline parameters, the quiet period, the dismissal margin, and agent budgets per run and per day. Past the daily model budget, the heuristic agent decides, at no cost.

In `kibana.yml`, under `xpack.significantEventsDetectionEngine`:

| Setting | Default | What it bounds |
|---|---|---|
| `run.timeBudget` | `150s` | When a run stops starting new minutes. |
| `run.leaseDuration` | `5m` | How long a crashed run blocks the next one. At least the time budget plus one minute. |
| `run.maxBucketsPerRun` | `10` | Minutes per strategy one run catches up. |
| `run.maxCatchUp` | `2h` | How far behind the engine may fall before it skips ahead. |
| `run.maxRuleEventRows` | `200000` | Rows one run reads from `.rule-events`. |
| `run.maxDetectionsPerRun` | `2000` | Detections that reach discovery in one run. |
| `run.maxPendingDetections` | `500` | Detections that wait for agent budget. |
| `agent.timeout` | `90s` | One agent call. |
| `rules.reconcileInterval` | `30m` | How often rules are rebuilt when nothing changed. |

## Limits to know

- Rules return at most 1,000 rows per run (the Alerting v2 cap), so the health check rule covers about 330 services per source, three minutes each.
- The health and KI rules run every minute, so their detections arrive about two and a half minutes after the minute they describe. New log patterns run every five minutes and arrive about six and a half minutes after.
- A KI rule only returns minutes with a match. Each KI also records a heartbeat every minute, and the baseline counts a service's minutes without a sample as zeros, so the first matches of a KI on a service are judged against zero instead of warming up.
- Alerting v2 does not say whether a rule ran. When a health rule wrote nothing for a source that has data, the source is skipped for that minute, so a late rule is never read as a silent service.
- On Serverless, Alerting v2 allows 400 rule runs per minute across all spaces. Each logs source costs about 1.2 of them: the health rule every minute, the patterns rule every five.

## Try it

1. Onboard a logs source in Nightshift. The engine watches every enabled source of the space and every match KI learned for it, promoted or not.
2. Open **Nightshift Management → Detection engine**. In the settings menu, press **Replay last 60 minutes** so every check starts with a baseline instead of warming up.
3. Turn on **Auto-run**. Health checks and KI rules report within about three minutes of a problem, new log patterns within about seven.
4. Open events appear in the main table; the **Services** column on the right shows which services have one. **Reset engine data** in the settings menu deletes what the engine produced and keeps its settings, schedule and rules.

Every decision, including the ones not to raise an event, is in the **Activity log** and **Every detection** tabs.
