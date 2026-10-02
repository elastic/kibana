# Alert Triage Worker load test

Loads the AlertZero **Alert Triage Worker** with synthetic alerts at a chosen rate and records how it copes: how long batches take to be triaged, what piles up in Workflows and Task Manager, what it costs in tokens, and how accurate the verdicts are. It works against a local stack or a remote (Cloud) deployment, using the same connection flags as `generate.ts`.

It **changes nothing about the Worker**. It never turns the Worker on, never edits settings, and adds no concurrency limits. Whatever the Worker is configured to do on the target is what gets measured, which is what makes two runs (for example before and after a workflow change) comparable.

## How it works

1. `generate.ts` seeds realistic alerts (with events behind them) into `.alerts-security.alerts-<space>`. That is a one-time setup step, and it is what gives the triage agent real data to enrich against.
2. `run` reads those alerts as **templates**, split by their ground-truth tag (`data-generator-fp` = false positive), then plans the load:
   - `burst`: `--batches` batches of `--batch-size` alerts, all dispatched at once, spread over `--rules` synthetic rules. A batch is what one rule execution hands the Worker, so keep `--batch-size` at or below the rules' `max_signals` (100 by default) unless you mean to stress a larger batch.
   - `sustained`: `--alerts-per-hour` alerts arriving over `--duration`, spread over `--rules` synthetic rules. A rule's alerts that arrive within one `--rule-interval` form one batch, dispatched at that rule's next execution, like a real rule handing the Worker a batch. Batches are split at `--max-batch-size` (default 100, the detection rule default).
3. For each batch at its planned time it clones the templates into fresh open alerts of a synthetic rule, bulk-indexes them, and starts the Worker with `POST /api/workflows/workflow/<worker>/run` and `inputs.event = { triggerType: 'alert', alertIds }`. The run API fetches the alerts by id and builds the same `event` (alerts plus the rule, derived from the first alert) that the Worker's steps read.
4. While it runs, a collector samples Workflows execution state and Task Manager health every `--poll-interval`.
5. It waits until every batch is **triaged** (or `--settle-timeout`), then writes the report.

Nothing real is created besides alerts: no rules, no rule executions. The synthetic rules exist only as a rule uuid on the alerts, which is all the Worker derives its batch from.

### What "triaged" means

At Manual autonomy a Worker run with a false positive parks on the proposal gate for up to 72 h, so run duration says nothing about the work. The tool treats a batch as **triaged** once the Worker's `post_comment_alert_updates` step is done (classified, then every alert tagged and noted) or the run has ended. That step runs once, after the per-alert tag and note loops, so it only finishes when the last note is written. A run parked on a proposal is therefore finished work, and is reported as `parked`.

## Prerequisites

- Kibana and Elasticsearch reachable, with `xpack.agenticInvestigations.enabled`, `xpack.alertzero.enabled` and `securitySolution:enableAlertZero` on.
- The **Alert Triage Worker turned on** in AlertZero for the space (this attaches it to detection rules; the tool only checks, and fails with a message if it is off).
- Alert Analysis turned on for the space, with the model you want to test routed for it.
- Detections initialised (open Security once), and a user or API key that can read and write the alerts index, run workflows, and read `.workflows-*` through the Workflows API and Task Manager health.
- Node from `.nvmrc`, and `node scripts/kbn bootstrap` done.

## Seed the templates

The tool needs a pool of true-positive and false-positive alerts. `generate.ts` creates them:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/data/generate_cli.js \
  --clean -n 300 --episodes ep1,noise1,noise2 \
  --packs okta,aws-iam,kubernetes,github-actions --fp-count 3 \
  --alert-mode preview \
  --kibanaUrl https://<deployment>.kb.<region>.cloud.es.io \
  --elasticsearchUrl https://<deployment>.es.<region>.cloud.es.io \
  --apiKey <base64-key>
```

`--fp-count 3` makes the generator index benign events that still trip each hunt, so the false-positive pool is not empty. By default the tool clones alerts whose rule tag is `data-generator` (`--template-tag` changes that).

## Run

From `x-pack/solutions/security/plugins/security_solution` (or use `node scripts/data/alert_triage_load_test/cli.js` with the same arguments from there):

```bash
# Plan only: nothing is indexed or dispatched
pnpm data:triage-load-test run --dry-run --mode sustained

# 500 alerts as five rules firing at once, 100 alerts each (75% false positives)
pnpm data:triage-load-test run --mode burst --batches 5 --batch-size 100 --rules 5

# Stress case: one rule handing over 500 alerts (needs a rule with max_signals >= 500)
pnpm data:triage-load-test run --mode burst --batch-size 500

# 1000 alerts/hour over 300 rules for 2 hours
pnpm data:triage-load-test run --mode sustained --alerts-per-hour 1000 --rules 300 --duration 2h

# Against Cloud
pnpm data:triage-load-test run --mode burst --batch-size 100 \
  --kibanaUrl https://<deployment>.kb.<region>.cloud.es.io \
  --elasticsearchUrl https://<deployment>.es.<region>.cloud.es.io \
  --apiKey <base64-key>
```

`ES_API_KEY` works instead of `--apiKey`. Use `--spaceId` for a non-default space. `--seed` makes the plan repeatable, so two runs get the same batches, sizes and labels.

Suggested scenarios:

| Scenario | Command |
| --- | --- |
| Smoke | `run --batch-size 8` |
| Single batch (default rule limit) | `run --batch-size 100` |
| Many rules at once | `run --batches 5 --batch-size 100 --rules 5` (500 alerts in five executions) |
| Large batch (stress) | `run --batch-size 500`, `1000`; only a rule with a raised `max_signals` hands over this many, and one execution then holds thousands of steps, which can slow Kibana and the Workflows UI |
| Sustained | `run --mode sustained --alerts-per-hour 1000 --rules 300 --duration 2h` |
| Step-up | repeat sustained with `--alerts-per-hour 2000`, `4000` until something gives |
| Skewed rules | sustained with `--rule-skew 1` (a few noisy rules) |
| Production-shaped, average day | see [Production-shaped load](#production-shaped-load) |
| Production-shaped, peak day | see [Production-shaped load](#production-shaped-load) |

### Production-shaped load

These parameters come from 30 days of data of one production deployment: about 73.6k alerts/day on average (peak 123k), 2,293 enabled rules (most on a 5 minute interval), and about 437 rule executions an hour that produced alerts. Those executions handed over 7.2 alerts on average (median 2, p95 31), and about 27% of the alerts were closed by automated triage, which is the closest match to the false positives of this tool. Alert counts are already after suppression.

`--rule-skew 1.7` reproduces that batch size distribution (about 440 batches an hour, mean ~7, p95 ~35) over 2,293 rules. Without skew almost every batch holds a single alert. Re-check it with `--dry-run` if you change `--rules` or `--alerts-per-hour`.

```bash
# Quarter of an average day, as a baseline
pnpm data:triage-load-test run --mode sustained --alerts-per-hour 770 --duration 30m \
  --rules 2293 --rule-skew 1.7 --rule-interval 5m --fp-rate 0.27 --settle-timeout 45m

# Average day: ~73.6k alerts/day
pnpm data:triage-load-test run --mode sustained --alerts-per-hour 3067 --duration 1h \
  --rules 2293 --rule-skew 1.7 --rule-interval 5m --fp-rate 0.27 --settle-timeout 90m

# Peak day: ~123k alerts/day
pnpm data:triage-load-test run --mode sustained --alerts-per-hour 5125 --duration 1h \
  --rules 2293 --rule-skew 1.7 --rule-interval 5m --fp-rate 0.27 --settle-timeout 90m

# Tail risk, from a second terminal while a sustained run is going: one rule at max_signals 1000
pnpm data:triage-load-test run --mode burst --batches 1 --batch-size 1000 --fp-rate 0.27
```

An hour at the average rate indexes about 3,000 alerts and sends every one of them to the model, and the peak run about 5,000, so check the token budget first. Step up through the runs and watch Task Manager drift and overdue tasks, peak Worker executions in flight and the dispatch-to-start delay; the first run where they grow faster than the load is the limit.

What these runs do not cover: real rule executions (the tool creates no rules, so the many executions that produce no alerts are not part of the load), and real rules cluster on schedule boundaries while the synthetic ones get a random phase, so real peaks may be somewhat spikier. Task Manager capacity scales with the number of Kibana nodes (10 workers each by default), so note the node count of the target next to the results.

Change the model on the target between runs, not in the tool; it is recorded in `manifest.json` only as far as the Worker and Alert Analysis settings expose it.

## Output

Each run writes `target/triage-load-test/<runId>/` (`--out-dir`, `--run-id`):

| File | Content |
| --- | --- |
| `manifest.json` | Git sha and branch, target, parameters, the Worker's settings (autonomy), Alert Analysis runtime config, plan totals |
| `plan.json` | The planned batches |
| `dispatches.ndjson` | One line per batch: rule, alert ids with ground-truth labels, dispatch time, indexing and run API latency, execution id, error |
| `samples.ndjson` | Every poll: batches per phase, Worker executions per status, the same for the child workflows, Task Manager figures |
| `task_manager_raw.ndjson` | Raw `_health` and `metrics` payloads per poll |
| `report.json`, `summary.md` | The result |

Re-run the analysis later, for example after parked runs have expired:

```bash
pnpm data:triage-load-test report --run-id <runId>
```

`report` and `clean --run-id` use the Kibana and Elasticsearch URLs and the space recorded in the run's `manifest.json`, so you do not repeat those flags. Credentials are never stored; pass them again (`--apiKey`, `--username`/`--password` or the environment variables) when the target needs them.

### The report

- **Dispatch**: batches and alerts, failures, run API and indexing latency.
- **Latency** (ms, p50 / p90 / p95 / p99 / max): dispatch to execution start (queue delay; it compares the client clock with the server's `startedAt`, so clock skew shows up here), dispatch to triaged, start to triaged, and per step for `create_investigation`, `attach_alerts`, `classify_alerts` (the LLM-bound one), `attach_impact`, `set_az_tags`, `add_verdict_notes` and `gate_fp_close`.
- **Throughput and saturation**: alerts triaged per hour, peak Worker executions in flight, and from Task Manager the peak drift p99, overdue tasks and load. Drift growing over the run is the sign that Task Manager cannot keep up.
- **Proposal queue**: the alert analysis and `system-create-alertzero-proposal` executions by status, with how many are still open. Proposal executions that are still open are the proposals waiting for a decision.
- **Accuracy**: the verdict tag the Worker wrote (`az:*`) against the ground truth, as a confusion table, the share of false positives found, and the share of true positives wrongly called false positive.
- **Token usage**: summed from the executions' `usage`, when the engine records it.
- **Failures**: non-completed executions grouped by error.

## Clean up

```bash
pnpm data:triage-load-test clean --run-id <runId>      # alerts of one run
pnpm data:triage-load-test clean                        # alerts of every run
pnpm data:triage-load-test clean --run-id <runId> --cancel-executions
```

`clean` deletes the alerts tagged `triage-load-test` (and `triage-load-test:<runId>`). With `--run-id` it targets the stack, space and alerts index recorded in that run's manifest; without it, it uses the target given on the command line. `--cancel-executions` also cancels the run's open Worker executions, for example the ones parked for 72 h. The Investigations and proposals the Worker already created are **not** deleted; decide or remove them in AlertZero. On a shared deployment, run against a dedicated space so they are easy to find.

## Known limits

- **Accuracy is an upper bound.** The clones carry no generator tags, but the source events the agent can look up through the alert's ancestors still carry `data-generator-fp` in their own `tags`. Latency, throughput and saturation figures are unaffected.
- **Rules are synthetic.** Alerts of one synthetic rule come from different templates, so a rule's alerts are not thematically coherent, and each alert keeps the name of the rule it was cloned from. The real `alert` trigger path, where the rule execution hands over the batch, is not exercised; rule execution load is not part of these numbers.
- **Queue delay is approximate.** The executions API does not return the enqueue time, so dispatch to start is measured against the client clock.
- **Proposal count is a proxy.** Pending proposals are counted as open `system-create-alertzero-proposal` executions, not from the proposals API.
- **The Worker's own child workflow ids** (`system-security-alert-analysis`, `system-create-alertzero-proposal`) are assumed to be global; pass `--child-workflow-ids` if a target installs them per space.
- Cloud API keys need access to the alerts index (read, write, delete by query for `clean`), and to Workflows and Task Manager health through Kibana.
