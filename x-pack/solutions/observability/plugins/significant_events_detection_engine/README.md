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
5. **Minutes are walked in order.** For each minute: the baseline check, then identity, the dismissal hold, join proposals and the agent for each detection, strongest first. Then the state machine updates every open event. A member's health only moves when its own strategy evaluated that minute. A minute that opened or changed an event is written and published before the next minute starts, so the first event of a busy run does not wait for the rest.
   - A series whose closed event comes back reopens it, unless code proposes joining an event already open for the same incident and the agent confirms: grouping is decided again for each episode, so a split made once does not repeat on every recurrence.
   - A minute is settled once its rule has provably run after it: health checks write rows on every run, so their minutes settle about 30 s after they end instead of after the fixed `settleMs`.
6. **Budgets never delay a decision.** When the model has no calls or no time left in a run (a call starts only with twice the slowest call so far left in the time budget), the heuristic agent decides at once, at no cost, and the activity log says so. Only past `maxDetectionsPerRun` does a detection wait in a queue for the next run; past `maxPendingDetections`, or after five tries, it is dropped and recorded. A run stops starting new minutes once its time budget is spent.
7. **Writes are checked.** Events are written with version checks. When an operator changed an event during a run, the run's change is dropped, its detections are recorded as `conflict`, and the next run starts from the operator's version. Publishing to `.rule-events` happens after the write; a failed publication is retried by the next run.

## How it learns

The learning loop runs after a scheduled run when at least `learning.interval_minutes` passed and the run left time (at most 90 s), or on `POST learning/_run`. It holds the run lease, so it never overlaps detection. Each pass:

1. **Reads evidence.** Labelled incidents (`confirmed` from **Confirm**, `false_positive` from a dismissal, `missed` from **Report missed**), dismissed events of the last week, Verifier failures, and what investigations keep: decision trees, Semantic Memory and Cortex pages, read from their `ai-index-idx-nightshift-*` indices, filtered by space, read-only. Only people and the Verifier make labels; nothing an AI wrote does.
2. **Writes memory.** Notes per series, per KI and per service, each with its evidence and an id, retired instead of deleted (`POST memory/{id}/_retire`). The agent reads them next to the case; investigations' pages come in as `investigation_context`, marked as context and not evidence.
3. **Observes topology.** Once an hour it counts, per service, the log lines that name another service. A service that names another 20+ times an hour calls it. Join proposals read these next to KI dependencies; a KI dependency under 70% confidence counts only when the data shows it too.
4. **Proposes candidates.**
   - From decision trees: a path from a symptom to a cause that two or more reinforced turns (finished investigations) marked becomes a detector. Code finds the service the path names and that service's log templates (CATEGORIZE); the model, when one is configured and budget is left, picks the template the checks looked for, otherwise keywords do; code builds a `LIKE` condition from the template and checks it runs.
   - From missed incidents: templates that appeared during the incident and were absent or five times rarer in the two hours before it.
   - From dismissals: a series dismissed twice or more gets the smallest `mad_k` that puts every dismissed value under its threshold.
5. **Moves each candidate one step** along the evolution path, with its bar set when it was proposed:

```
proposed ─replay─► trial ─► review ─► live ─watch─► kept
    │                 │        │        │
    ▼                 ▼        ▼        ▼
replay_failed    rolled_back rejected rolled_back
```

   - **Replay** runs the detector over past data with direct queries (24 h, or further back to reach the incidents it must catch) through the same baseline check, and scores the events it would have opened against labelled incidents on its service. It fails when it misses a kept incident, is later than `max_warning_minutes`, or opens more than `max_false_opens_per_day` outside every incident. Its evaluations are stored, so a detector starts live with a warm baseline. A threshold replays the engine's own stored evaluations with both `mad_k` values and must keep every incident the current one catches.
   - **Trial**: the `learned_detectors` strategy runs the detector on live data as an Alerting v2 rule and records what it would raise, nothing more, for `min_trial_minutes`.
   - **Review**: with autonomy `suggest`, a person approves (`POST candidates/{id}/_approve`) or rejects; with `act` it goes live by itself.
   - **Live** with its strategy's daily cap, watched for `watch_minutes`. It rolls back by itself after `rollback_dismissals` dismissed events; a threshold also rolls back when an incident on its service is reported missed.
   - One change at a time per service and source. Failed candidates are kept, and their signature is never proposed again.

   - A failed candidate is replayed once more, with the same bar, when people label new incidents on its service after it failed: without labels, real incidents count as false opens.
6. **Proposes changes to the customer's KIs**, never makes them: a KI that matched in 90% or more of the minutes of the last day describes normal behaviour (and keeps its events open); one that never matched in six hours or more watches nothing. `GET learning` returns them as `ki_proposals`.

Confirming is per episode (`POST events/{id}/_confirm` with `episode`): each recurrence of an event is its own labelled case.

Autonomy is set per capability in `learning.autonomy`: `memory`, `tuning`, `detectors`, each `off`, `suggest` or `act`. The customer's KIs, rules and alerts are never changed.

The strategy scorecard is the loop's reward: `10 x incidents caught - 10 x incidents missed on services it watches - 3 x dismissed events - 2 x conclusions the Verifier found did not hold`.

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
| Event view data: evidence rows, each signal's minutes | `server/lib/overview/event_inspection.ts` |
| Learning loop, memory, labels, candidates, topology | `server/lib/learning/*`; the strategy that runs learned detectors is `server/lib/strategies/learned_detectors.ts` |

## Storage

Everything is written as the Kibana system user, filtered by space on every read, behind the Nightshift privileges on every route. Users need no access to the engine's hidden indices.

| What | Where | Kept |
|---|---|---|
| Every evaluation of every series, breaching or not | `.significant_events-detection_engine-observations` (data stream) | 3 days |
| Detections, with their baseline decision and outcome | `.significant_events-detection_engine-detections` (data stream) | 30 days |
| Activity log | `.significant_events-detection_engine-activity` (data stream) | 30 days |
| Run summaries | `.significant_events-detection_engine-runs` (data stream) | 14 days |
| Events, current state | `.significant_events-detection_engine-events` (index) | until reset |
| Settings, bookmarks, lease, cost, owned rules, waiting detections | `.significant_events-detection_engine-state` (index) | until reset |
| Memory notes, labelled incidents, candidates, observed topology | `.significant_events-detection_engine-state` (index) | until a reset with `include_learning` |

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
- The health and KI rules run every minute. Health check minutes settle as soon as the rule has run after them (about 30 s after the minute ends), so a problem is raised about 1.5-2 minutes after it starts; KI rules write only on a match, so their minutes wait the fixed two and a half minutes. New log patterns run every five minutes and arrive about six and a half minutes after.
- A KI rule only returns minutes with a match. Each KI also records a heartbeat every minute, and the baseline counts a service's minutes without a sample as zeros, so the first matches of a KI on a service are judged against zero instead of warming up.
- Alerting v2 does not say whether a rule ran. When a health rule wrote nothing for a source that has data, the source is skipped for that minute, so a late rule is never read as a silent service.
- On Serverless, Alerting v2 allows 400 rule runs per minute across all spaces. Each logs source costs about 1.2 of them: the health rule every minute, the patterns rule every five.

## Try it

1. Onboard a logs source in Nightshift. The engine watches every enabled source of the space and every match KI learned for it, promoted or not.
2. Open **Nightshift Management → Detection engine**. In the settings menu, press **Replay last 60 minutes** so every check starts with a baseline instead of warming up.
3. Turn on **Auto-run**. Health checks and KI rules report within about three minutes of a problem, new log patterns within about seven.
4. Open events appear in the main table; the **Services** column on the right shows which services have one. **Reset engine data** in the settings menu deletes what the engine produced and keeps its settings, schedule and rules.
5. Open an event to see:
   - what its status means right now, such as how many signals are still above normal or how many quiet minutes it needs to close;
   - how fast it was raised, from the first bad minute to the published Alerting v2 alert, with the wait for late data shown apart from the engine's own time;
   - each signal with the rule that reported it, its minutes charted against its normal, the AI step's verdict, and its evidence query, which **Show the rows** runs as you;
   - every step the engine took, one occurrence at a time.

The table's **Raised after** column and the **Typical time to raise** figure only count events raised after reaction times were recorded; older events show the times from their activity log inside the event view.

Every decision, including the ones not to raise an event, is in the **Activity log** and **Every detection** tabs.
