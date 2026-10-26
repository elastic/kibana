# Significant Events detection engine

The detection engine described in `nightshift-program/workstreams/detection/design-decisions/2026-10-14-detection-engine-architecture.md`. Signal strategies watch the customer's data, their signals land next to the customer's own alerts, and triage groups them into a few significant events, each a real Kibana alert. Each decision runs in deterministic code where it can; one bounded AI step checks evidence, rates severity and decides which open event a signal joins, using code's proposal or a search over the open events. The context layer, knowledge and the learning loop, tells both what the system looks like and what people corrected.

The plugin has no UI of its own. The **Detection engine** tab of `significant_events_app` reads and drives it through the internal API under `/internal/significant_events/detection_engine`, using the typed client in this plugin's browser start contract.

## How it runs

```
Context layer                       Detection engine
-------------                       ----------------
Sources ─► Knowledge ──────────────► Signal strategies (Alerting v2 signal rules)
           KIs, topology,                │
           customer rules                ▼
              ▲                     Alerting v2 storage: signals ─┐
              │                     customer alerts (.alerts-*) ──┤
Learning loop ◄─ labels, outcomes        │                        ▼
 memory, tuning, new rules ────────► Triage, every minute: baseline check, identity,
                                     join proposals, one AI step, state machine, Verifier
                                         │
                                         ▼
                                    Significant events, written to .rule-events
```

Managed workflow (every minute) ─► `POST _tick` ─► one run per space.

1. **Strategies run on the platform.** Health checks, known failure queries, new log patterns and dependency health are Alerting v2 `signal` rules the engine creates and owns, one per strategy and source. Alerting v2 schedules them, retries them and runs them with an API key. The known failure queries rule counts every match KI of the source per service and minute, promoted or not, with one `COUNT(*) WHERE` per KI; a KI whose query is more than `FROM <source> | WHERE ...` is listed as skipped. Change regressions run directly too, because they compare a new version with the service before it rather than counting per minute. Customer alerts are read directly from `.alerts-*`, because classic alerts never reach `.rule-events`. Each alert gets the entity its rule watches: the alert's `service.name`, a `service:` tag, or what knowledge from customer rules found in the rule's definition (see below).
2. **A managed workflow runs the engine.** `system-significant-events-detection-engine-<space>` is installed per space when someone turns on Auto-run. Every minute it calls `POST _tick` with the API key of the person who turned it on. Its executions show in the Workflows app.
3. **Each run continues where the last one stopped.** Every strategy has a bookmark, the end of the last minute it evaluated. A run evaluates the minutes that settled since then: a rule's minute is settled once the rule has run after it. A run handles at most `maxBucketsPerRun` minutes per strategy. If the engine is more than `maxCatchUp` behind, it skips ahead and records how many minutes it skipped.
4. **One run per space at a time.** A run takes a lease in the state index with a version check, so the schedule, Run now and a backtest never overlap, even across Kibana nodes. A crashed run's lease expires.
5. **Minutes are walked in order.** For each minute: the baseline check, then identity, the dismissal hold, join proposals and the agent for each signal, strongest first. Then the state machine updates every open event. A member's health only moves when its own strategy evaluated that minute. A minute that opened or changed an event is written and published before the next minute starts, so the first event of a busy run does not wait for the rest.
   - A series whose closed event comes back is grouped again: code proposes an open event for the same incident when there is one, and otherwise the agent decides whether it is the closed event's problem (it reopens) or a different one (a new event), so a split made once does not repeat on every recurrence.
   - A minute is settled once its rule has provably run after it: health checks write rows on every run, so their minutes settle about 30 s after they end instead of after the fixed `settleMs`.
6. **Budgets never delay a decision.** When the model has no calls or no time left in a run (a call starts only with twice the slowest call so far left in the time budget), the heuristic agent decides at once, at no cost, and the activity log says so. Only past `maxSignalsPerRun` does a signal wait in a queue for the next run; past `maxPendingSignals`, or after five tries, it is dropped and recorded. A run stops starting new minutes once its time budget is spent.
7. **Writes are checked.** Events are written with version checks. When an operator changed an event during a run, the run's change is dropped, its signals are recorded as `conflict`, and the next run starts from the operator's version. Publishing to `.rule-events` happens after the write; a failed publication is retried by the next run.

## Strategies

Each strategy watches for one kind of problem and writes observations in one format; triage reads only that format. The thresholds come from the evidence review in `nightshift-program/workstreams/detection/research/2026-10-23-detection-strategies-evidence-review.md`.

| Strategy | Runs as | Reports when |
|---|---|---|
| Health checks | One Alerting v2 rule per logs source, every minute | More failed requests than the service's own normal rate allows by chance (binomial p <= 1e-4, 5+ failures, 2+ points above normal), in the minute or over the last five minutes; latency at twice the previous hour, on the p95 with 100+ durations a minute or the median with 20+; traffic falling 90% for longer than a Poisson tail allows; most of a source going quiet at once. Warning ratio only supports other signals |
| Known failure queries | One rule per source, every minute | A KI query matches a service's lines above that series' own normal |
| New log patterns | One rule per source, every five minutes | A service logs an error pattern, 10+ error lines in its first window, that it had not logged in the previous two hours nor in the last seven days. New warning patterns, and smaller error ones, only support an open event |
| Dependency health | One rule per source, every minute | A dependency gets 5+ failed calls from the services that call it over the last five minutes, above its own normal. A line names its dependency in a URL host, a quoted value or a logfmt value, strongest form first |
| Change regressions | Direct, every run | A new `service.version`, or a new instance where there is no version, fails at least twice as often as the service did in the half hour before (binomial p <= 1e-4), or its median latency doubles, within 90 minutes of appearing |
| Customer alerts | Direct, from `.alerts-*` and `.rule-events` | A customer alert is active and does not fire so often that it is background |
| Learned detectors | One rule per source, every minute | A detector the learning loop wrote matches, above its own normal |

What the strategies share:

- **Fields are bound per source** (`strategies/source_fields.ts`). Level, request status and duration come from ECS fields where they are filled and are parsed out of the message where they are not, in JSON, logfmt and quoted forms. A source whose `log.level` is mapped but always empty, as with services that log their level only inside a JSON body, would otherwise show no errors at all.
- **Failures are counted against requests**, not against every log line: documents with a status or a duration, plus the ones that report a failure. A source with neither counts log lines, names the signal "error-log share" and gives it less weight.
- **Two of three minutes.** A series that holds no open event reaches triage only once it looked off in two of its last three minutes (`confirmation` on the descriptor). The signal in between is recorded as `unconfirmed`. Silence asks for its own persistence, so it skips this.
- **Supporting signals** (`supporting` on an observation) join an open event they belong to and never open or reopen one: the warning ratio, small or warning-only new patterns, and each service's silence while its whole source is silent or its source's silence event is still open.
- **Five-minute windows.** The error ratio and dependency health also judge the last five minutes, evaluated every minute, so a quiet service failing 30% of eight requests a minute is seen. A pooled window only fires while the current minute still fails, so recovery is not held back.
- **Silence needs a normal.** A service is judged for silence only after 30 minutes of history with data in 90% of its minutes.
- **References leave problems out.** The trigger references (expected traffic, normal latency, normal error rate) skip minutes that were breaching, so an outage never drags its own normal down.
- **The baseline check** compares latency on a log scale and widens the count floor by the series' own dispersion; it needs 30 samples before it decides. A sparse series counts a minute as zero only when its service sent data in it, so a collector outage is not a run of zeros.

## Triage

Triage takes each signal that passed the baseline check through identity, the dismissal hold, join proposals and one AI step. What the context layer adds:

- **Customer alerts come from both stores.** Classic alerts from `.alerts-*`, and alerts of the customer's own Alerting v2 rules from `.rule-events`, where the engine's signals and significant events also live. Significant events the engine publishes are left out.
- **Knowledge from customer rules gives each alert an entity.** The alert's `service.name` or a `service:` tag first. Otherwise the rule's name and parameters are matched against the services the engine sees in the data; when exactly one is named, that is the entity. When none is, a low-cost model (`triage.rule_entity_connector_id`, else the agent's connector) reads the rule once and picks a service from the same list, or none. Answers are stored per rule and definition (`customer_rule` state documents), so a rule costs at most one model call until it changes.
- **Customer alerts are judged by how often they fire**, not by their value: their rule already decided that. An alert Kibana marks as flapping, one that started three or more times in the last hour, or one active on five or more of the last seven days is background. It never opens an event, and in an event it counts as healthy, so a chronic rule cannot hold an event open.
- **A case lists the customer alerts on its own entities**, from anywhere in the run: the signal's service, its related services and the services of the event it may join. Background alerts are left out.
- **The topology sees call paths that logs never name.** Besides logs that name another service, the hourly topology pass reads one settled minute of each source and links services that logged the same request or trace ids (`kind: shared_requests`), the way traces would. A case's rows that carry the same id in both services count as an evidence row linking them.
- **Dependencies stay inside their source.** A KI dependency or an observed call links services only within the Nightshift source it was learned from, because two systems can each have a `postgres`. The agent sees each signal's and event's source by title and is told that different sources are different systems.
- **The heuristic joins on an anchor.** When the model has no time or budget, the heuristic confirms a join along a direct call edge when the event already holds the same kind of symptom on the service at the other end, within three minutes: latency on the gateway and on the search it calls are one slowdown, though latency rows never name a service.
- **Topology counts a service as named only where a call names it**: a URL host, a quoted value or a logfmt value. A name inside another name (`media-gateway`) or in plain text (`shop pricing computed`) no longer makes an edge.
- **Code proposes joins from the case's own rows.** When the signal's evidence rows name a service that an open event holds, in the same source ("dependency failed: catalogue", "edge-cache returned 503"), code proposes that event (`named_in_evidence`), even with no dependency known. It is the observed topology, measured per case instead of once an hour, and the heuristic confirms it the same way it confirms a dependency.
- **The AI step can search the open events.** Besides code's proposal, the agent gets a `case_id` and the `detection_engine_event_search` tool. It joins a proposal the evidence supports without searching, and searches when there is none or the evidence does not support it; it may join any open event the evidence links. Reopen cases get no search.
- **A recurrence is grouped again.** When a closed event's series fires again and no open event is proposed, the agent decides whether it is the same problem, which reopens the event, or a different one, which opens a new event, so an old event's story is never carried into a new incident. The closed event's own evidence is marked as from its earlier episode, since its queries are pinned to the minutes they first fired, and the agent judges this episode by the signal's own rows. A signal whose own evidence the agent refutes raises nothing, new or reopened. The heuristic always reopens.
- **The Verifier feeds the state machine.** When an open event's evidence returns nothing and none of its signals is firing, it sends `evidence_gone`: the event starts recovering. It checks again ten minutes later, and a second miss closes the event (`close_reason: evidence_gone`), even when a member cannot be evaluated to prove recovery.

Each of these can be switched off under `triage` in `PUT config`, so the evals can measure what it adds: `event_search`, `evidence_named_joins`, `source_scoped_dependencies`, `request_path_dependencies`, `regroup_recurrences`, `verifier_closes`, `alert_firing_frequency`.

## How it learns

The learning loop runs after a scheduled run when at least `learning.interval_minutes` passed and the run left time (at most 90 s), or on `POST learning/_run`. It holds the run lease, so it never overlaps a detection run. Each pass:

1. **Reads evidence.** Labelled incidents (`confirmed` from **Confirm**, `false_positive` from a dismissal, `missed` from **Report missed**), dismissed events of the last week, Verifier failures, and what investigations keep: decision trees, Semantic Memory and Cortex pages, read from their `ai-index-idx-nightshift-*` indices, filtered by space, read-only. Only people and the Verifier make labels; nothing an AI wrote does.
2. **Writes memory.** Notes per series, per KI and per service, each with its evidence and an id, retired instead of deleted (`POST memory/{id}/_retire`). The agent reads them next to the case; investigations' pages come in as `investigation_context`, marked as context and not evidence.
3. **Observes topology.** Once an hour it counts, per service, the log lines that name another service. A service that names another 20+ times an hour calls it. It also reads one settled minute per source and links services that logged 10+ of the same request or trace ids: they sit on one call path, direction unknown. Join proposals read these next to KI dependencies; a KI dependency under 70% confidence counts only when the data shows it too.
4. **Proposes candidates.**
   - From decision trees: a path from a symptom to a cause that two or more reinforced turns (finished investigations) marked becomes a detector. Code finds the service the path names and that service's log templates (CATEGORIZE); the model, when one is configured and budget is left, picks the template the checks looked for, otherwise keywords do; code builds a `LIKE` condition from the template and checks it runs.
   - From missed incidents: templates that appeared during the incident and were absent or five times rarer in the two hours before it. One CATEGORIZE runs over both windows, so a line gets the same template on both sides. The incident a detector was mined from stays a regression check (`trained_on`), never its evidence: until it catches another incident, a person approves it whatever the autonomy.
   - From dismissals: a series dismissed twice or more gets the smallest `mad_k` that puts every dismissed value under its threshold.
5. **Moves each candidate one step** along the evolution path, with its bar set when it was proposed:

```
proposed ─replay─► trial ─► review ─► live ─watch─► kept
    │                 │        │        │
    ▼                 ▼        ▼        ▼
replay_failed    rolled_back rejected rolled_back
```

   - **Replay** runs the detector over past data with direct queries (24 h, or further back to reach the incidents it must catch) through the same baseline check, and scores the events it would have opened against labelled incidents on its service. An open on a dismissed incident is false; one outside every labelled incident is unlabelled, since nobody looked at it. It fails when it misses a kept incident, is later than `max_warning_minutes`, or opens more than `max_false_opens_per_day` outside every real incident, unlabelled and dismissed together. Its evaluations are stored, so a detector starts live with a warm baseline. A threshold replays the engine's own stored evaluations with both `mad_k` values and must keep every incident the current one catches.
   - **Trial**: the `learned_detectors` strategy runs the detector on live data as an Alerting v2 rule and records what it would raise, nothing more, for `min_trial_minutes`. The trial is a canary: 30 minutes cannot estimate a daily rate, so it fails only when even the 95% Poisson lower bound of its open rate is above `max_false_opens_per_day`. How noisy a detector is over a day comes from the replay.
   - **Review**: with autonomy `suggest`, a person approves (`POST candidates/{id}/_approve`) or rejects; with `act` it goes live by itself.
   - **Live** with its strategy's daily cap, watched for `watch_minutes`. It rolls back by itself after `rollback_dismissals` dismissed events; a threshold also rolls back when an incident on its service is reported missed.
   - One change at a time per service and source. Failed candidates are kept, and their signature is never proposed again.

   - A failed candidate is replayed once more, with the same bar, when people label new incidents on its service after it failed: without labels, real incidents count as unlabelled opens against the bar.
6. **Proposes changes to the customer's KIs**, never makes them: a KI that matched in 90% or more of the minutes of the last day describes normal behaviour (and keeps its events open); one that never matched in six hours or more watches nothing. `GET learning` returns them as `ki_proposals`.

Confirming is per episode (`POST events/{id}/_confirm` with `episode`): each recurrence of an event is its own labelled case.

Autonomy is set per capability in `learning.autonomy`: `memory`, `tuning`, `detectors`, each `off`, `suggest` or `act`. The customer's KIs, rules and alerts are never changed.

The strategy scorecard is the loop's reward: `10 x incidents caught - 10 x incidents missed on services it watches - 3 x dismissed events - 2 x conclusions the Verifier found did not hold`.

## Where things are

| Piece | Where |
|---|---|
| Strategies and their rules | `server/lib/strategies/*`; rule reconciliation in `server/lib/rules/*` |
| Reading what rules wrote | `server/lib/strategies/rule_events_reader.ts` (point in time, row cap, latest row per bucket) |
| One run | `server/lib/engine/run_engine.ts`; its steps sit next to it (`plan_windows`, `evaluate_strategies`, `triage_step`, `lifecycle_step`, `verifier_step`, `persist_step`) |
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
| Signals, with their baseline decision and outcome | `.significant_events-detection_engine-signals` (data stream) | 30 days |
| Activity log | `.significant_events-detection_engine-run_activity` (data stream) | 30 days |
| Run summaries | `.significant_events-detection_engine-run_summaries` (data stream) | 14 days |
| Events, current state | `.significant_events-detection_engine-events` (index) | until reset |
| Settings, bookmarks, lease, cost, owned rules, waiting signals | `.significant_events-detection_engine-state` (index) | until reset |
| Memory notes, labelled incidents, candidates, observed topology, the entity of each customer rule | `.significant_events-detection_engine-state` (index) | until a reset with `include_learning` |

The engine keeps its own observations because Alerting v2 writes nothing for an evaluation that returns no rows. The baseline check needs those zeros, and the derived values (error ratio, drop in traffic) that rules do not compute.

## Settings

Per space, through `PUT config`: strategy modes and daily caps, the agent and its connector, baseline parameters (including the count floor), the quiet period, the dismissal margin, agent budgets per run and per day, and the triage switches and rule-reading model (see Triage). Past the daily model budget, the heuristic agent decides, at no cost.

In `kibana.yml`, under `xpack.significantEventsDetectionEngine`:

| Setting | Default | What it bounds |
|---|---|---|
| `run.timeBudget` | `150s` | When a run stops starting new minutes. |
| `run.leaseDuration` | `5m` | How long a crashed run blocks the next one. At least the time budget plus one minute. |
| `run.maxBucketsPerRun` | `10` | Minutes per strategy one run catches up. |
| `run.maxCatchUp` | `2h` | How far behind the engine may fall before it skips ahead. |
| `run.maxRuleEventRows` | `200000` | Rows one run reads from `.rule-events`. |
| `run.maxSignalsPerRun` | `2000` | Signals that reach triage in one run. |
| `run.maxPendingSignals` | `500` | Signals that wait for agent budget. |
| `agent.timeout` | `90s` | One agent call. |
| `rules.reconcileInterval` | `30m` | How often rules are rebuilt when nothing changed. |

## Limits to know

- Rules return at most 1,000 rows per run (the Alerting v2 cap), so the health check rule covers about 330 services per source, three minutes each.
- The health check and known failure query rules run every minute. Health check minutes settle as soon as the rule has run after them (about 30 s after the minute ends), so a problem is raised about 1.5-2 minutes after it starts; known failure query rules write only on a match, so their minutes wait the fixed two and a half minutes. New log patterns run every five minutes and arrive about six and a half minutes after.
- Counts get a floor that follows their mean (`baseline.count_noise_k`, mean + k x sqrt(mean + 1)): a KI that matches a few routine lines most minutes has a median and MAD of zero, and without the floor any busier minute was above normal and opened a low-severity event.
- A known failure query rule only returns minutes with a match. Each KI also records a heartbeat every minute, and the baseline counts a service's minutes without a sample as zeros, so the first matches of a KI on a service are judged against zero instead of warming up.
- Silence is a Poisson test, not the baseline check: the drop is capped at 1, and on a bursty service median + k x MAD of its drops is often above 1, which would block a total outage. The last one, two or three minutes must each fall 90% below the expected traffic and together be below what chance allows (p <= 1e-4). The expected traffic, and the latency reference, leave out minutes that were near-silent or breaching, so an outage never drags its own reference down.
- p95 latency is judged only on minutes with at least 100 durations. Fewer and the minute is left unjudged, which never proves recovery.
- New log patterns are new per service: a pattern another service in the source logged all along still fires for the service that starts logging it.
- An event whose signals all came from sources that are no longer enabled closes with `close_reason: source_removed`: nothing can evaluate it again, so it would otherwise stay open for good.
- A workflow execution whose task died while the machine slept stays `running` in `.workflows-executions`, and the workflow's `drop` concurrency then skips every later tick; the engine's health turns `stalled`, but it cannot heal this itself, since nothing calls it. Marking that execution `cancelled` lets the schedule resume.
- Alerting v2 does not say whether a rule ran. When a health rule wrote nothing for a source that has data, the source is skipped for that minute, so a late rule is never read as a silent service.
- On Serverless, Alerting v2 allows 400 rule runs per minute across all spaces. Each logs source costs about 1.2 of them: the health rule every minute, the patterns rule every five.

## Try it

1. Onboard a logs source in Nightshift. The engine watches every enabled source of the space and every match KI learned for it, promoted or not.
2. Open **Nightshift Management → Detection engine**. In the settings menu, press **Replay last 60 minutes** so every check starts with a baseline instead of warming up.
3. Turn on **Auto-run**. Health checks and known failure queries report within about three minutes of a problem, new log patterns within about seven.
4. Open events appear in the main table; the **Services** column on the right shows which services have one. **Reset engine data** in the settings menu deletes what the engine produced and keeps its settings, schedule and rules.
5. Open an event to see:
   - what its status means right now, such as how many signals are still above normal or how many quiet minutes it needs to close;
   - how fast it was raised, from the first bad minute to the published Alerting v2 alert, with the wait for late data shown apart from the engine's own time;
   - each signal with the rule that reported it, its minutes charted against its normal, the AI step's verdict, and its evidence query, which **Show the rows** runs as you;
   - every step the engine took, one occurrence at a time.

The table's **Raised after** column and the **Typical time to raise** figure only count events raised after reaction times were recorded; older events show the times from their activity log inside the event view.

Every decision, including the ones not to raise an event, is in the **Activity log** and **Every signal** tabs.
