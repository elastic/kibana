# Alert Triage Worker load test

Loads the AlertZero **Alert Triage Worker** with synthetic alerts at a chosen rate and records how it copes: how long alerts take to be triaged, what piles up in Workflows and Task Manager, what it costs in tokens, and how accurate the verdicts are. It works against a local stack or a remote (Cloud) deployment, using the same connection flags as `generate.ts`.

It **changes nothing about the Worker**. It never turns the Worker on, never edits settings, never starts a Worker run and adds no concurrency limits. The Worker sweeps the untriaged alerts of the space on its own schedule (every 15 minutes by default) and starts a `system-security-floor-alert-triage-batch` run per rule, so the tool only indexes alerts and watches what the sweeps do with them. Whatever the Worker is configured to do on the target is what gets measured, which is what makes two runs (for example before and after a workflow change) comparable.

## How it works

1. `generate.ts` seeds realistic alerts (with events behind them) into `.alerts-security.alerts-<space>`. That is a one-time setup step, and it is what gives the triage agent real data to enrich against.
2. `run` reads those alerts as **templates**, split by their ground-truth tag (`data-generator-fp` = false positive), then plans the load:
   - `burst`: `--batches` batches of `--batch-size` alerts, all indexed at once, spread over `--rules` synthetic rules.
   - `sustained`: `--alerts-per-hour` alerts arriving over `--duration`, spread over `--rules` synthetic rules. A rule's alerts that arrive within one `--rule-interval` form one batch, indexed at that rule's next interval, like a real rule producing a batch of alerts. Batches are split at `--max-batch-size` (default 100, the detection rule default).
3. For each planned batch at its planned time it clones the templates into fresh open alerts of a synthetic rule (no `az:*` tags) and bulk-indexes them. Nothing else is started: the Worker's next sweep finds them. A planned batch is a unit of the test, not of the Worker: the sweep groups the pending alerts of a rule into its own batches, within its budget and look-back.
4. While it runs, a collector samples Workflows execution state and Task Manager health every `--poll-interval`.
5. It waits until every planned batch is **triaged** (or `--settle-timeout`), then writes the report.

Nothing real is created besides alerts: no rules, no rule executions. The synthetic rules exist only as a rule uuid on the alerts, which is all the Worker derives its batch from.

### What "triaged" means

A planned batch is **triaged** once every one of its alerts carries a verdict tag (`az:true_positive`, `az:false_positive` or `az:inconclusive`). The time is when a poll first saw that, so use a short `--poll-interval` (for example `10s`) when comparing; the default 30s is the resolution of the latency figures. At Manual autonomy a false positive then waits for a human on a proposal for up to 72 h, which does not delay the batch being triaged. A batch whose alerts the Worker tagged `az:triage_failed` never settles, so the run ends at `--settle-timeout` with a partial report.

The Worker's runs in the report are the batch workflow's runs since the start of the test, and the child workflows default to Alert Analysis, the review workflow and the proposal workflow. They count every execution since the start, so use a dedicated stack. A sweep can pick up the alerts of several planned batches in one run, so there is no per-batch start time or run time.

## Prerequisites

- Kibana and Elasticsearch reachable, with `xpack.agenticInvestigations.enabled`, `xpack.alertzero.enabled` and `securitySolution:enableAlertZero` on.
- The **Alert Triage Worker turned on** in AlertZero for the space; the tool only checks, and fails with a message if it is off. Mind its settings: the budget per hour caps how many alerts a sweep triages, and the look-back window decides which of the indexed alerts are eligible.
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
# Plan only: nothing is indexed
pnpm data:triage-load-test run --dry-run --mode sustained

# 500 alerts over five rules at once, 100 alerts each (75% false positives)
pnpm data:triage-load-test run --mode burst --batches 5 --batch-size 100 --rules 5

# Stress case: one rule with 500 pending alerts
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
| Many rules at once | `run --batches 5 --batch-size 100 --rules 5` (500 alerts over five rules) |
| Large backlog for one rule (stress) | `run --batch-size 500`, `1000`; the sweep splits it into batches of at most 100 alerts per run |
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

# Tail risk, from a second terminal while a sustained run is going: one rule with 1000 pending alerts
pnpm data:triage-load-test run --mode burst --batches 1 --batch-size 1000 --fp-rate 0.27
```

An hour at the average rate indexes about 3,000 alerts and sends every one of them to the model, and the peak run about 5,000, so check the token budget first. Step up through the runs and watch Task Manager drift and overdue tasks, peak batch executions in flight and the dispatch-to-triaged time; the first run where they grow faster than the load is the limit.

What these runs do not cover: real rule executions (the tool creates no rules, so the many executions that produce no alerts are not part of the load), and real rules cluster on schedule boundaries while the synthetic ones get a random phase, so real peaks may be somewhat spikier. Task Manager capacity scales with the number of Kibana nodes (10 workers each by default), so note the node count of the target next to the results.

Change the model on the target between runs, not in the tool; it is recorded in `manifest.json` only as far as the Worker and Alert Analysis settings expose it.

## Output

Each run writes `target/triage-load-test/<runId>/` (`--out-dir`, `--run-id`):

| File | Content |
| --- | --- |
| `manifest.json` | Git sha and branch, target, parameters, the Worker's settings (autonomy), Alert Analysis runtime config, plan totals |
| `plan.json` | The planned batches |
| `dispatches.ndjson` | One line per batch: rule, alert ids with ground-truth labels, indexing time, when the alerts became visible, error |
| `samples.ndjson` | Every poll: batches per phase, batch workflow executions per status, the same for the child workflows, Task Manager figures |
| `triaged.ndjson` | When each planned batch was first seen triaged, so `report --run-id` can rebuild the timings |
| `task_manager_raw.ndjson` | Raw `_health` and `metrics` payloads per poll |
| `report.json`, `summary.md` | The result |

Re-run the analysis later, for example after the proposals have expired:

```bash
pnpm data:triage-load-test report --run-id <runId>
```

`report` and `clean --run-id` use the Kibana and Elasticsearch URLs and the space recorded in the run's `manifest.json`, so you do not repeat those flags. Credentials are never stored; pass them again (`--apiKey`, `--username`/`--password` or the environment variables) when the target needs them.

### The report

- **Dispatch**: planned batches and alerts, batches whose alerts failed to index, indexing latency.
- **Latency** (ms, p50 / p90 / p95 / p99 / max): dispatch to triaged (alerts indexed until every alert carries a verdict; it includes the wait for the next sweep, up to one interval), and per step of the batch workflow runs for `create_investigation`, `attach_alerts`, `classify_alerts` (the LLM-bound one), `attach_impact`, `set_az_true_positive_tags`, `set_az_false_positive_tags`, `set_az_inconclusive_tags`, `add_verdict_notes` and `gate_fp_close`.
- **Throughput and saturation**: alerts triaged per hour, peak batch executions in flight, and from Task Manager the peak drift p99, overdue tasks and load. Drift growing over the run is the sign that Task Manager cannot keep up.
- **Proposal queue**: the alert analysis and `system-create-alertzero-proposal` executions by status, with how many are still open. Proposal executions that are still open are the proposals waiting for a decision. The report and the live samples in `samples.ndjson` count every execution of those workflows since the run started, whoever started it, so use a dedicated stack.
- **Accuracy**: the verdict tag the Worker wrote (`az:*`) against the ground truth, as a confusion table, the share of false positives found, and the share of true positives wrongly called false positive.
- **Token usage**: summed from the executions' `usage`, when the engine records it.
- **Failures**: non-completed executions grouped by error.

## Clean up

```bash
pnpm data:triage-load-test clean --run-id <runId>      # alerts of one run
pnpm data:triage-load-test clean                        # alerts of every run
pnpm data:triage-load-test clean --run-id <runId> --cancel-executions
```

`clean` deletes the alerts tagged `triage-load-test` (and `triage-load-test:<runId>`). With `--run-id` it targets the stack, space and alerts index recorded in that run's manifest; without it, it uses the target given on the command line. `--cancel-executions` also cancels the batch workflow runs that are still open and started since the run began, for example the ones waiting on a proposal for 72 h. The Investigations and proposals the Worker already created are **not** deleted; decide or remove them in AlertZero. On a shared deployment, run against a dedicated space so they are easy to find.

## Known limits

- **Accuracy is an upper bound.** The clones carry no generator tags, but the source events the agent can look up through the alert's ancestors still carry `data-generator-fp` in their own `tags`. Latency, throughput and saturation figures are unaffected.
- **Rules are synthetic.** Alerts of one synthetic rule come from different templates, so a rule's alerts are not thematically coherent, and each alert keeps the name of the rule it was cloned from. The alerts reach the Worker the way real ones do, through its sweep; rule execution load is not part of these numbers.
- **Times are coarse.** A batch is dated by the poll that first saw every alert tagged, and the sweep adds up to one interval of waiting that a rule-triggered Worker did not have.
- **Proposal count is a proxy.** Pending proposals are counted as open `system-create-alertzero-proposal` executions, not from the proposals API.
- **The Worker's own child workflow ids** (`system-security-alert-analysis`, `system-create-alertzero-proposal`) are assumed to be global; pass `--child-workflow-ids` if a target installs them per space.
- Cloud API keys need access to the alerts index (read, write, delete by query for `clean`), and to Workflows and Task Manager health through Kibana.
