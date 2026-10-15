# Detection engine prototype

A working prototype of the architecture in `nightshift-program/workstreams/detection/design-decisions/2026-10-14-detection-engine-architecture.md`. It runs next to today's pipeline and does not change it. Try it in **Nightshift Management → Detection engine**.

## Try it

1. Open the **Detection engine** tab and press **Set up demo system**. It writes three hours of logs for `frontend`, `checkout`, `payments` and `inventory` to `logs-detectionlab-default`, creates the "Detection engine lab" source with its services, dependencies and KI queries, then replays the history so every check has a baseline.
2. Turn on **Auto-run**. It creates the workflow `detection-engine-prototype-autorun-<space>`, which runs the engine every minute on the server, so it keeps scanning after you leave the page. The header shows when the next check is due, links to the workflow, and warns when nothing has run for three minutes.
3. In **Break something**, start **Payments outage**. Within about a minute payments turns red on the system map and one event opens; checkout's errors join it, because knowledge says checkout calls payments.
4. **The customer's own alert** adds a real Kibana rule for checkout 5xx errors. When it fires, the Customer alerts strategy reads the alert and it joins the event.
5. Press **Recover everything**. The event moves to recovering and closes after two healthy minutes; the verifier re-checks it on the next run.
6. In the event view, dismiss an event with a reason while its problem continues: the next detections are held until the problem is 25% worse.
7. In the gear menu, switch **Discovery agent** to a model connector to have a model, instead of the heuristic, check evidence and confirm or veto joins. The **Model cost so far** tile adds each run's tokens at Elastic Inference Service list price, read from the plugin's price catalog.

Every decision, including the ones not to raise an event, is in the **Activity log** and **Every detection** tabs.

### Five-minute demo script

1. Point at the system map and the empty events list: a healthy system raises nothing.
2. Start **Payments outage**; while waiting, walk the five pipeline cards and the colour legend (customer, code, AI).
3. Open the event: the facts row, "Why this is significant", the signals with their join reasons, and the timeline.
4. Start **Slow frontend**: no KI describes it, and health checks still catch it as a separate event.
5. Switch the agent to a model, start **Inventory goes silent**, and show the model's verdicts and the cost tile moving by cents.
6. **Recover everything** and watch both events close.

## How it maps to the design

| Design piece | Where |
|---|---|
| Detection strategies and the common detection format | `strategies/*`, `EngineDetection` in `common/detection_engine/types.ts` |
| Rules from KIs, health checks, customer alerts, new log patterns | `strategies/ki_rules.ts`, `health_checks.ts`, `customer_alerts.ts`, `new_log_patterns.ts` |
| Baseline check in code, leaving out open-incident buckets | `baseline.ts` |
| Stable identity, repeats, dismissal hold | `engine.ts` (identity step) |
| Join proposals in code; the agent confirms or vetoes | `join_proposals.ts`, `agent/*` |
| One bounded agent step, answers validated in code | `agent/build_case.ts`, `agent/llm_agent.ts`, `agent/validate_answer.ts` |
| Severity guards | `guardSeverity` in `agent/validate_answer.ts` |
| One state machine owns status; recovery needs every member healthy | `state_machine.ts` |
| Cooldown: no agent call when nothing changed | `engine.ts` (cooldown step) |
| Verifier after open and after close | `verifyRecentEvents` in `engine.ts`, `verifyEvent` in `operator_actions.ts` |
| Trial runs, replay on past data, daily caps | `engine.ts` (`replayEngine`, trial and cap steps) |
| Learning: memory from dismissals, scorecards, proposals a person accepts | `learning.ts` |
| Activity log | `storage.ts` (`.significant_events-engine-activity`) |
| Cost of model calls | `cost.ts`, priced through `server/lib/cost/price_service.ts` |
| Hand-off as an Alerting v2 alert | `publish.ts`, through `RuleEventsClient` |

## What the prototype decides

The architecture leaves "where do new strategies run?" open. The prototype runs every strategy in its own engine run and stores every evaluation, breaching or not, in `.significant_events-engine-observations`, because the baseline check needs the non-breaching ones and Alerting v2 does not keep them.

## Shortcuts taken

- Storage is plain hidden indices written as the current user, not registered data streams.
- Auto-run is a regular workflow created on demand, not a managed one installed with the plugin.
- One bucket size (one minute) and one space at a time; a missed bucket is not evaluated later.
- The heuristic agent stands in for the model when no connector is chosen; both answer in the same shape.
- Publishing writes each changed event to `.rule-events`, so the existing Significant events tab shows it too. Resetting the lab does not remove what was already published.
