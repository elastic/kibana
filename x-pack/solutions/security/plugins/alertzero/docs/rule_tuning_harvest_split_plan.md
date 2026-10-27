# Rule Tuning: split the false-positive harvest

Tickets:

- [elastic/security-team#20133](https://github.com/elastic/security-team/issues/20133):
  the `harvest_fp_alerts_by_rule` ES|QL query in
  `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/rule_tuning_worker.yaml`
  runs over every alert of the space in the analysis window. On a 32.7M-alert
  index it times out at Kibana's 30s request timeout, which can't be raised on ECH.
- [elastic/security-team#20315](https://github.com/elastic/security-team/issues/20315):
  the query keeps the 20 noisiest rules before `list_enabled_candidates` checks
  which of them are enabled, so disabled and deleted rules use up the slots and
  enabled rules go unreviewed.

One change fixes both: list the enabled rules first, then screen only those for
FP rate, then harvest alert ids only for the rules that passed.

## Why the current query is slow

Measured on a 2-node 4 GB cluster (details under "Measurements"): 165s over 8.8M
alerts in a 14-day window, 17.6M documents read, 266 CPU-s.

1. **`METADATA _id` is the dominant cost.** `_id` has no doc values; ES|QL
   loads it through the stored-fields reader, decompressing chunks that also
   hold the ~6.5 KB `_source` of neighbouring alerts. The same query over the
   same 240k rows took 3.7–13.3s with `_id` and 0.6–0.7s with
   `kibana.alert.uuid`, a doc-value keyword that holds the same value.
2. **`INLINE STATS` scans the source twice.** ES|QL plans it as an
   `InlineJoin`: the aggregation runs first as its own pass, then the main plan
   runs a second pass and hash-joins the result back. `documents_found` is
   exactly 2× the window.
3. **`is_fp` is decided in `EVAL`**, so Lucene can't skip non-FP documents,
   and `_id` is loaded for nearly every alert, not just the false positives.

## Target shape

| Step | Source | Reads | Returns |
|---|---|---|---|
| 0 `list_enabled_rules` | alerting `_find` | `id`, `revision` of enabled siem rules | uuids and `uuid@revision` keys |
| 1 `screen_rule_fp_rates` | alerts of enabled rules in the window | 4 doc-value columns, one pass | rules passing the FP-rate gate, with totals |
| 2 `harvest_fp_alerts_by_rule` | FP alerts of the screened rules | doc values only (no `_id`) | unreviewed FP count and newest 100 alert uuids per rule |

Step 0 replaces `collect_candidates`, `list_enabled_candidates` and
`resolve_current_revisions`, which did the same lookup after the harvest. A
`terms` filter of a few thousand uuids is pushed to Lucene and only shrinks what
step 1 reads.

Step 1 is a plain `STATS` over doc values: 0.5s for 8.8M alerts. In steady state
it returns nothing and the sweep stops there. Step 2 runs over a Lucene
`terms` × `term` × `term` filter and reads the alert uuid from doc values, so it
is bounded by the FP volume of the qualifying rules: 0.6–0.9s for 991k rows.

Both gates stay exact. The rate gate uses `fp_rate_count` (all FPs, reviewed or
not), same as today. `fp_rate_count >= min_fp_count` in step 1 is an upper
bound on the unreviewed count, so it can only let through rules that step 2
then rejects, never drop a real candidate.

## Step 0: `list_enabled_rules`

The alerting `_find` honours `fields`, so the response is ~75 bytes per rule
(150 KB for 2k rules). The detection engine `_find` returns a 500 when `fields`
is passed (its response transform needs the whole rule), and without `fields`
it is ~1.8 KB per rule.

```yaml
# Disabled and deleted rules would otherwise take screen slots (their alerts
# outlive them in the index). Scoping the screen to enabled rules handles both.
# Fails closed: without the list the screen is skipped and the run is flagged,
# same as today's list_enabled_candidates error.
- name: list_enabled_rules
  type: kibana.request
  with:
    method: GET
    path: "/s/{{ workflow.spaceId }}/api/alerting/rules/_find?filter={{ 'alert.attributes.enabled: true and alert.attributes.consumer: siem' | url_encode }}&per_page=10000&fields=revision"
  on-failure:
    continue: true

- name: resolve_enabled_rules
  type: data.set
  if: "${{ steps.list_enabled_rules.error == null }}"
  with:
    rule_uuids: "${{ steps.list_enabled_rules.output.data | default: consts.no_rows | map: 'id' }}"
    count: "${{ steps.list_enabled_rules.output.data | default: consts.no_rows | size }}"
    rule_revision_keys: ",{% for rule in steps.list_enabled_rules.output.data %}{{ rule.id }}@{{ rule.revision }},{% endfor %}"
```

Counts live in `data.set` and `if` compares them, because a comparison cannot
follow a filter chain inside `${{ }}` (same reason `collect_active_rules`
computes `parsed_count`).

`per_page=10000` is the saved-objects `max_result_window`. A space with more
enabled rules than that would need paging; not handled here.

## Step 1: `screen_rule_fp_rates`

Takes the current harvest's DSL filter (window, EQL sequence members, in-flight
rules) plus the enabled-rule `terms`. The in-flight exclusion keeps happening
before any slot is taken.

```yaml
# total_count spans every alert the rule produced in the window; fp_rate_count
# includes reviewed FPs so processing a batch does not dilute the measured rate.
# fp_rate_count is an upper bound on the unreviewed count the harvest measures,
# so the min_fp_count check here is a pre-filter, not the gate.
- name: screen_rule_fp_rates
  type: elasticsearch.esql.query
  if: "${{ steps.resolve_enabled_rules.output.count > 0 }}"
  with:
    allow_partial_results: false
    filter:
      bool:
        filter:
          - range:
              "@timestamp":
                gte: "now-{{ inputs.analysis_window_days | default: consts.analysis_window_days }}d"
          - terms:
              kibana.alert.rule.uuid: "${{ steps.resolve_enabled_rules.output.rule_uuids }}"
        must_not:
          - exists:
              field: kibana.alert.group.index
          - terms:
              kibana.alert.rule.uuid: "${{ steps.resolve_active_rules.output.rule_uuids | default: consts.no_rows }}"
    query: |-
      FROM .alerts-security.alerts-{{ workflow.spaceId }}
      | EVAL is_fp = `kibana.alert.workflow_status` == "closed"
          AND `kibana.alert.workflow_reason` == "false_positive"
      | STATS total_count = COUNT(*),
          fp_rate_count = COUNT(*) WHERE is_fp
        BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`
      | WHERE fp_rate_count >= {{ inputs.min_fp_count | default: consts.min_fp_count }}
        AND fp_rate_count * 100 >= total_count * {{ inputs.min_fp_rate_pct | default: consts.min_fp_rate_pct }}
      | SORT fp_rate_count DESC
      | LIMIT {{ consts.max_screened_rules }}
      | EVAL rule_revision_key = CONCAT(",", `kibana.alert.rule.uuid`, "@", TO_STRING(`kibana.alert.rule.revision`), ",")
      | KEEP `kibana.alert.rule.uuid`, total_count, fp_rate_count, rule_revision_key
  on-failure:
    continue: true

# Drops rows whose revision is not the rule's current one (a rule edited
# mid-window) before they reach the harvest.
- name: resolve_screened_rules
  type: data.set
  with:
    rows: "${{ steps.screen_rule_fp_rates.output.values | default: consts.no_rows | where_exp: 'row', 'steps.resolve_enabled_rules.output.rule_revision_keys contains row[3]' }}"
    count: "${{ steps.screen_rule_fp_rates.output.values | default: consts.no_rows | where_exp: 'row', 'steps.resolve_enabled_rules.output.rule_revision_keys contains row[3]' | size }}"
    fanout_limit: "${{ inputs.max_rules_per_sweep | default: consts.max_rules_per_sweep }}"
```

Row layout: `[uuid, total_count, fp_rate_count, rule_revision_key]`.

New const `max_screened_rules: 50`. Only enabled, existing rules compete for
the slots now, so the limit is a cap on harvest work, not a correctness
boundary. It is applied after aggregation, so raising it costs nothing on the
ES side; it only lengthens the harvest's `terms` list.

## Step 2: `harvest_fp_alerts_by_rule`

Runs only when step 1 left current-revision rows. DSL filter: window, the two
FP `term` clauses, and the screened uuids via Liquid `map: '0'` (works on
positional rows). The ES|QL body is today's harvest minus the totals, the rate
gate and `METADATA _id`.

```yaml
# Only FP alerts of screened rules reach ES|QL, so INLINE STATS's two passes and
# the TOP key are bounded by their FP volume. Security alerts are indexed with
# _id = kibana.alert.uuid, so the uuid is read from doc values instead of the
# stored-fields loader that METADATA _id needs.
- name: harvest_fp_alerts_by_rule
  type: elasticsearch.esql.query
  if: "${{ steps.resolve_screened_rules.output.count > 0 }}"
  with:
    allow_partial_results: false
    filter:
      bool:
        filter:
          - range:
              "@timestamp":
                gte: "now-{{ inputs.analysis_window_days | default: consts.analysis_window_days }}d"
          - term:
              kibana.alert.workflow_status: closed
          - term:
              kibana.alert.workflow_reason: false_positive
          - terms:
              kibana.alert.rule.uuid: "${{ steps.resolve_screened_rules.output.rows | map: '0' }}"
        must_not:
          - exists:
              field: kibana.alert.group.index
    query: |-
      FROM .alerts-security.alerts-{{ workflow.spaceId }}
      | INLINE STATS reviewed_watermark = MAX(@timestamp)
          WHERE MV_CONTAINS(`kibana.alert.workflow_tags`, "{{ consts.reviewed_tag }}"),
          latest_revision = MAX(`kibana.alert.rule.revision`)
        BY `kibana.alert.rule.uuid`
      | WHERE `kibana.alert.rule.revision` == latest_revision
        AND (reviewed_watermark IS NULL OR @timestamp > reviewed_watermark)
      | EVAL fp_recency_key = CONCAT(DATE_FORMAT("yyyyMMddHHmmssSSS", @timestamp), "|", `kibana.alert.uuid`)
      | STATS fp_count = COUNT(*),
          last_fp_at = MAX(@timestamp),
          recent_keys = TOP(fp_recency_key, {{ consts.max_diagnosis_ids }}, "desc")
        BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`
      | WHERE fp_count >= {{ inputs.min_fp_count | default: consts.min_fp_count }}
      | SORT fp_count DESC
      | LIMIT {{ consts.max_candidate_rules }}
      | MV_EXPAND recent_keys
      | EVAL alert_id = SUBSTRING(recent_keys, 19)
      | STATS fp_count = MAX(fp_count),
          last_fp_at = MAX(last_fp_at),
          alert_ids = VALUES(alert_id)
        BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`
      | EVAL rule_revision_key = CONCAT(",", `kibana.alert.rule.uuid`, "@", TO_STRING(`kibana.alert.rule.revision`), ",")
      | SORT fp_count DESC
      | KEEP `kibana.alert.rule.uuid`, fp_count, last_fp_at, alert_ids, rule_revision_key
  on-failure:
    continue: true
```

Row layout goes from 7 to 5 columns: `[uuid, fp_count, last_fp_at, alert_ids, rule_revision_key]`.
Every `row[6]` downstream becomes `row[4]`.

Semantics kept:

- Reviewed watermark per rule across revisions, `latest_revision` still drops
  older revisions before they take a `LIMIT` slot. Tagged alerts are closed FPs
  (the review tags the ids this harvest handed it), so they are in the set.
- `fp_count` is exact, so the `min_fp_count` gate is exact.
- Only current-revision rules are reviewed. The key check moved from after the
  harvest to before it, and is repeated on the harvest rows because
  `latest_revision` there is the max among the rule's FPs, which can lag the
  current revision when the new revision has no FPs yet.

Semantics that shift, accepted:

- If an analyst reopens a tagged alert it leaves the FP set and the watermark
  falls back to the next-newest tagged alert. Each review tags up to 100
  alerts, so a handful of already-reviewed FPs resurface once.

### `_id` equals `kibana.alert.uuid`

`create_persistence_rule_type_wrapper.ts` indexes each alert with
`{ create: { _id: alert._id } }` and `build_alert.ts` writes the same id into
`kibana.alert.uuid`. Verified on 9,389 real alerts across esql, eql, query,
threshold and new_terms rules: 100% equal. The review tags and fetches alerts
by `_id`, so the uuid is a drop-in.

## Downstream changes

`collect_candidates`, `list_enabled_candidates` and `resolve_current_revisions`
go away. `resolve_fanout_rows` keeps its shape, reading the keys from step 0:

```yaml
- name: resolve_fanout_rows
  type: data.set
  with:
    rows: "${{ steps.harvest_fp_alerts_by_rule.output.values | default: consts.no_rows | where_exp: 'row', 'steps.resolve_enabled_rules.output.rule_revision_keys contains row[4]' | slice: 0, steps.resolve_screened_rules.output.fanout_limit }}"
```

The review's `total_alert_count` / `total_fp_count` come from the screen row
with the same key, looked up per iteration:

```yaml
- name: run_reviews
  type: foreach
  foreach: "${{ steps.resolve_fanout_rows.output.rows | default: consts.no_rows }}"
  steps:
    - name: resolve_totals
      type: data.set
      with:
        row: "${{ steps.resolve_screened_rules.output.rows | where_exp: 'row', 'row[3] == foreach.item[4]' | first }}"

    - name: run_review
      type: workflow.executeAsync
      on-failure:
        continue: true
      with:
        workflow-id: system-security-rule-tuning-review
        run-as-mode: inherit
        inputs:
          rule_uuid: "{{ foreach.item.0 }}"
          fp_count: "${{ foreach.item.1 }}"
          last_fp_at: "{{ foreach.item.2 }}"
          alert_ids: "${{ foreach.item.3 }}"
          total_alert_count: "${{ steps.resolve_totals.output.row.1 | default: 0 }}"
          total_fp_count: "${{ steps.resolve_totals.output.row.2 | default: 0 }}"
          # ... unchanged
```

The Liquid pieces (`where_exp` with `contains` / `==` against positional rows,
`| first` then `.1`, `map: '0'` and `map: 'id'`) were checked against liquidjs.

## Failure handling

- `list_enabled_rules` error: `resolve_enabled_rules` is skipped, so the
  screen's `if` is false and nothing downstream runs. Flagged like today's
  `list_enabled_candidates` error.
- Screen error: `output` is empty, `resolve_screened_rules` yields no rows, the
  harvest's `if` skips it.
- `harvest_failed`, `source_read_failed`, `degraded_reason` and `run_outcome`
  gain `or steps.list_enabled_rules.error != null or steps.screen_rule_fp_rates.error != null`
  and lose `list_enabled_candidates`.
- A skipped step has no `error`, so the no-candidate path is unchanged.

## Code changes

Managed version of the worker goes 30 → 31 so the installed copy is replaced.

1. `rule_tuning_worker.yaml`: steps 0–2 above, `resolve_enabled_rules`,
   `resolve_screened_rules`, `resolve_totals`, `max_screened_rules` const;
   delete `collect_candidates`, `list_enabled_candidates`,
   `resolve_current_revisions`; `row[6]` → `row[4]`; error flags. Move the
   header comment's totals/rate explanation to the screen step.
2. `x-pack/solutions/security/plugins/alertzero/server/managed_workflows/detection_rule_workflows.test.ts`
   - `measures FP rate independently from the unreviewed work queue`: assert on
     `screen_rule_fp_rates`'s query.
   - `skips rules whose review is still in flight`: the in-flight `must_not`
     now lives on the screen step's filter.
   - watermark test: unchanged assertions, plus one that the harvest query has
     no `METADATA _id` and keys on `kibana.alert.uuid`.
   - revision-filter test (~line 730): rows become 5 columns, keys come from
     `resolve_enabled_rules`.
   - tests that reference `list_enabled_candidates` / `collect_candidates`
     move to `list_enabled_rules`: alerting `_find` path, `fields=revision`,
     `consumer: siem` filter.
   - new tests: screen `if` is false when the enabled list is empty or the
     lookup errored; screen filter carries the enabled uuids; harvest `if` is
     false on an empty screen; `resolve_screened_rules` drops non-current
     revisions; `resolve_totals` picks the screen row by `foreach.item[4]`;
     harvest filter carries the two FP `term` clauses and the screened uuids.
3. `.../report_worker_outcome/shipped_yaml_contract.detection.fixture.ts`: add
   `list_enabled_rules` and `screen_rule_fp_rates` step states (empty output,
   and an error variant); drop `list_enabled_candidates`.
4. `src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_reports.detection.test.ts`:
   `harvest_failed` cases for a lookup error and a screen error.

## Scout test: the sweep launches the same rules

`x-pack/solutions/security/plugins/security_solution/test/scout_alertzero/api/tests/rule_tuning_sweep_candidates.spec.ts`
runs the real sweep workflow against seeded alerts and reads the launch list
from the `resolve_fanout_rows` step, which keeps its name and row shape
(`row[0]` uuid, `row[1]` fp_count) across the change. Test 1 passed against
the previous worker too, so it pins the result the rewrite had to keep.

Setup: admin user, AlertZero on in the default space, alerts index created via
`POST /api/detection_engine/index`, rules created through the rules API with a
query that matches nothing, alerts bulk-indexed with `_id = kibana.alert.uuid`
and a run-unique `kibana.alert.rule.name` prefix (deleted after each test).
Reviews start under `autonomy_level: manual`, so they park at the analyst gate
and never call a model.

Test 1, parity (passes before and after), thresholds 10 / 50% / 7 days:

| rule | alerts | expected |
|---|---|---|
| all-fp | 12 FP | launched, fp 12 |
| mixed | 20 FP + 10 open | launched, fp 20 |
| low-rate | 20 FP + 40 open | no (33%) |
| few-fp | 5 FP | no |
| reviewed | 12 FP, all tagged | no (0 unreviewed) |
| partly-reviewed | 12 tagged (3h ago) + 11 untagged (1h ago) | launched, fp 11 |
| disabled | 30 FP, rule disabled | no |
| edited | 30 FP at revision 0, rule now revision 1 | no |

Expected launch order: mixed, all-fp, partly-reviewed.

Test 2, #20315 (failed against the previous worker): 20 uuids with 25 FPs each
and no rule object, plus two enabled 12-FP rules. Expected: the two rules. Before
the change the ghosts took all 20 `max_candidate_rules` slots and nothing
launched.

Run (the `alertzero` config set turns the plugin on; the default classic
config leaves it disabled and the managed workflow is then not installed):

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet alertzero
```

```bash
node scripts/playwright test --config x-pack/solutions/security/plugins/security_solution/test/scout_alertzero/api/playwright.config.ts --project=local --grep "Rule Tuning sweep"
```

`scout run-tests --location local` starts its own servers, so don't combine it
with a running `start-server`.

## Measurements

Perf cluster `az-vd-perf-01` (9.6.0-SNAPSHOT, 2 data nodes × 4 GB heap),
alerts cloned from real ones with ~6.5 KB `_source`, 11 backing indices,
~45 GB. 9.67M alerts total, 8.8M in the 14-day window (971k FP, 148k tagged
reviewed). 170 rule uuids have alerts; 22 of them exist as enabled rules in
Kibana, the other 148 are synthetic noise rules with no rule object, which is
the "deleted rule" case. Defaults (`min_fp_count` 10, `min_fp_rate_pct` 50),
cluster idle, each query twice (cold / warm):

| query | took | docs read | CPU |
|---|---|---|---|
| current harvest | 165.1s / 167.3s | 17.6M (2 passes) | 266s / 329s |
| screen, no enabled filter | 0.6s / 0.5s | 8.8M | 2.4s / 1.8s |
| harvest, `kibana.alert.uuid`, screened rules | 0.9s / 0.6s | 991k | 2.8s / 2.4s |
| **screen + harvest** | **1.5s / 1.1s** | | **5.2s / 4.2s** |

Enabled-first pipeline, same window:

| step | took | docs read | CPU |
|---|---|---|---|
| alerting `_find`, 22 enabled rules, `fields=revision` | 0.63s / 0.52s | | |
| screen with enabled `terms` | 0.1s / 0.1s | 1.6M | 0.6s / 0.5s |
| harvest | 0.7s / 0.6s | 983k | 2.4s / 2.4s |
| **find + screen + harvest** | **1.4s / 1.3s** | | |

With every rule in the space enabled (2,283, so a 2,283-id `terms` filter) and
those rules executing on schedule, the whole set rerun with the script from
"Run it yourself" (2026-10-27):

| step | took | docs read | CPU |
|---|---|---|---|
| current harvest | 183.7s / 169.6s | 16.5M (2 passes) | 338s / 292s |
| alerting `_find`, 2,283 enabled rules, `fields=revision`, 173 KB | 1.7s / 1.4s | | |
| screen with enabled `terms` | 0.3s / 0.2s | 1.6M | 1.0s / 0.8s |
| harvest | 0.8s / 1.1s | 910k | 2.7s / 3.1s |
| **find + screen + harvest** | **2.9s / 2.7s** | | **3.7s / 3.9s** |

An earlier pass right after the bulk enable, while 2,283 rules were still
scheduling, had the `_find` at 4.1s / 2.1s and the pipeline at 5.5s / 3.7s.

All variants return the same 5 rules with the same counts (the top rule's
`fp_count` drifts by a few dozen between runs because the 14-day window slides
while the current query runs for three minutes). The current query is 6× over
Kibana's 30s default timeout at this size; the new pipeline is 60× faster, and
the id list has no visible cost on the ES side. At thousands of rules the
`_find` is the slowest step. The screen read 1.6M instead of 8.8M docs because
the 148 synthetic rules were excluded by the `terms` filter; in a space where
every alert-producing rule exists and is enabled, the screen reads the whole
window as before (0.5s).

Checks for #20315, from the same run:

- Deleted rules: with the gate relaxed to `fp_rate_count >= 1`, the screen
  without the enabled filter returned 50 rules, 44 of them with no rule object;
  with the filter it returned 18, all enabled.
- Disabled rule: disabling the top candidate (`2a799fab`, 169k FPs) via
  `PATCH /api/detection_engine/rules` and rerunning gave 4 candidates, the
  other four unchanged; re-enabling restored 5.

Earlier runs at 2.2M alerts, while the clone was still loading, isolate the
causes:

| query | took | docs read | CPU |
|---|---|---|---|
| current harvest | 47.2s / 75.1s | 3.2M (2 passes) | 63s / 95s |
| FP-only harvest, still `METADATA _id` | 15.3s / 19.3s | 408k | 12s / 17s |
| harvest (step 2) with `_id`, screened rules | 13.3s / 3.7s | 236k | 9.5s / 5.5s |
| harvest (step 2) with `kibana.alert.uuid` | 0.7s / 0.6s | 240k | 1.0s / 0.9s |

Same rows, same query: 13.3s with `_id`, 0.7s with `kibana.alert.uuid`. The
FP-only harvest with a `LIMIT 20` before the rate gate also lost two
qualifying rules to noise rules (many FPs, 2% rate), which is why the screen
runs first.

## Run it yourself

One script runs everything in the Measurements section against any Kibana + ES
pair: the current query, the enabled-first pipeline (cold and warm), the
parity check between the two, and both #20315 checks. It lives next to the
plugin's other scripts and needs only Python 3:

```bash
python3 x-pack/solutions/security/plugins/alertzero/scripts/rule_tuning_harvest_bench.py --kibana https://<deployment>.kb.<region>.gcp.elastic-cloud.com --user elastic --deleted-check --disable-top --out /tmp/harvest_bench
```

The password comes from `ES_PASSWORD`, from `~/.netrc` (`--netrc` for another
file), or a prompt. `--skip-current` skips the slow query, `--days`,
`--min-fp`, `--min-rate` change the inputs, `--disable <uuid>` picks the rule
to flip instead of the top candidate, and `--out` writes every ES|QL response
in full (columns, values, alert ids) as JSON. The `--disable-top` check patches
a real rule off and back on, so run it on a cluster you own.

To see exactly what the new pipeline sends, `rule_tuning_harvest_pipeline.py`
(same folder, same flags minus the checks) runs steps 0–2 once and prints each
request with its body, the outcome on the next line, and every result row:

```bash
python3 x-pack/solutions/security/plugins/alertzero/scripts/rule_tuning_harvest_pipeline.py --kibana https://<deployment>.kb.<region>.gcp.elastic-cloud.com --user elastic
```

The same queries by hand, in Dev Tools. Step 0 goes through the `kbn:` proxy;
`data[].id` are the uuids for step 1's `terms`:

```
GET kbn:/api/alerting/rules/_find?filter=alert.attributes.enabled:true and alert.attributes.consumer:siem&per_page=10000&fields=revision
```

`allow_partial_results` is a URL parameter on `_query`, not a body field (the
workflow step maps it to the URL for you). The responses are returned whole:
`columns` then `values`, `alert_ids` as an array per row (a plain string when a
rule has exactly one id). Add `"profile": true` to the body if you want
`profile.drivers[].cpu_nanos`; it multiplies the response size.

Current query, for a side-by-side run. Dev Tools goes through Kibana's 30s
proxy timeout, so at this size it has to be sent to the ES host directly; the
same body works with curl:

```bash
curl -u elastic2 --max-time 600 -H 'Content-Type: application/json' 'https://<es-host>/_query?allow_partial_results=false' -d @current_query.json
```

```json
POST _query?allow_partial_results=false
{
  "filter": {
    "bool": {
      "filter": [{ "range": { "@timestamp": { "gte": "now-14d" } } }],
      "must_not": [{ "exists": { "field": "kibana.alert.group.index" } }]
    }
  },
  "query": "FROM .alerts-security.alerts-default METADATA _id | EVAL is_fp = `kibana.alert.workflow_status` == \"closed\" AND `kibana.alert.workflow_reason` == \"false_positive\" | INLINE STATS reviewed_watermark = MAX(@timestamp) WHERE MV_CONTAINS(`kibana.alert.workflow_tags`, \"detection-watch:tuning-reviewed\"), latest_revision = MAX(`kibana.alert.rule.revision`) BY `kibana.alert.rule.uuid` | WHERE `kibana.alert.rule.revision` == latest_revision | EVAL is_unreviewed_fp = is_fp AND (reviewed_watermark IS NULL OR @timestamp > reviewed_watermark) | EVAL fp_recency_key = CONCAT(DATE_FORMAT(\"yyyyMMddHHmmssSSS\", @timestamp), \"|\", _id) | STATS total_count = COUNT(*), fp_rate_count = COUNT(*) WHERE is_fp, fp_count = COUNT(*) WHERE is_unreviewed_fp, last_fp_at = MAX(@timestamp) WHERE is_unreviewed_fp, recent_keys = TOP(fp_recency_key, 100, \"desc\") WHERE is_unreviewed_fp BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision` | WHERE fp_count >= 10 AND fp_rate_count * 100 >= total_count * 50 | SORT fp_count DESC | LIMIT 20 | MV_EXPAND recent_keys | EVAL alert_id = SUBSTRING(recent_keys, 19) | STATS fp_count = MAX(fp_count), last_fp_at = MAX(last_fp_at), alert_ids = VALUES(alert_id), total_count = MAX(total_count), fp_rate_count = MAX(fp_rate_count) BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision` | EVAL rule_revision_key = CONCAT(\",\", `kibana.alert.rule.uuid`, \"@\", TO_STRING(`kibana.alert.rule.revision`), \",\") | SORT fp_count DESC | KEEP `kibana.alert.rule.uuid`, fp_count, last_fp_at, alert_ids, total_count, fp_rate_count, rule_revision_key"
}
```

Step 1, with the enabled uuids from step 0:

```json
POST _query?allow_partial_results=false
{
  "filter": {
    "bool": {
      "filter": [
        { "range": { "@timestamp": { "gte": "now-14d" } } },
        { "terms": { "kibana.alert.rule.uuid": ["<enabled uuids>"] } }
      ],
      "must_not": [{ "exists": { "field": "kibana.alert.group.index" } }]
    }
  },
  "query": "FROM .alerts-security.alerts-default | EVAL is_fp = `kibana.alert.workflow_status` == \"closed\" AND `kibana.alert.workflow_reason` == \"false_positive\" | STATS total_count = COUNT(*), fp_rate_count = COUNT(*) WHERE is_fp BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision` | WHERE fp_rate_count >= 10 AND fp_rate_count * 100 >= total_count * 50 | SORT fp_rate_count DESC | LIMIT 50 | EVAL rule_revision_key = CONCAT(\",\", `kibana.alert.rule.uuid`, \"@\", TO_STRING(`kibana.alert.rule.revision`), \",\") | KEEP `kibana.alert.rule.uuid`, total_count, fp_rate_count, rule_revision_key"
}
```

Step 2, with the uuids step 1 returned:

```json
POST _query?allow_partial_results=false
{
  "filter": {
    "bool": {
      "filter": [
        { "range": { "@timestamp": { "gte": "now-14d" } } },
        { "term": { "kibana.alert.workflow_status": "closed" } },
        { "term": { "kibana.alert.workflow_reason": "false_positive" } },
        { "terms": { "kibana.alert.rule.uuid": ["<screened uuids>"] } }
      ],
      "must_not": [{ "exists": { "field": "kibana.alert.group.index" } }]
    }
  },
  "query": "FROM .alerts-security.alerts-default | INLINE STATS reviewed_watermark = MAX(@timestamp) WHERE MV_CONTAINS(`kibana.alert.workflow_tags`, \"detection-watch:tuning-reviewed\"), latest_revision = MAX(`kibana.alert.rule.revision`) BY `kibana.alert.rule.uuid` | WHERE `kibana.alert.rule.revision` == latest_revision AND (reviewed_watermark IS NULL OR @timestamp > reviewed_watermark) | EVAL fp_recency_key = CONCAT(DATE_FORMAT(\"yyyyMMddHHmmssSSS\", @timestamp), \"|\", `kibana.alert.uuid`) | STATS fp_count = COUNT(*), last_fp_at = MAX(@timestamp), recent_keys = TOP(fp_recency_key, 100, \"desc\") BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision` | WHERE fp_count >= 10 | SORT fp_count DESC | LIMIT 20 | MV_EXPAND recent_keys | EVAL alert_id = SUBSTRING(recent_keys, 19) | STATS fp_count = MAX(fp_count), last_fp_at = MAX(last_fp_at), alert_ids = VALUES(alert_id) BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision` | EVAL rule_revision_key = CONCAT(\",\", `kibana.alert.rule.uuid`, \"@\", TO_STRING(`kibana.alert.rule.revision`), \",\") | SORT fp_count DESC | KEEP `kibana.alert.rule.uuid`, fp_count, last_fp_at, alert_ids, rule_revision_key"
}
```

Local test runs:

```bash
node scripts/jest x-pack/solutions/security/plugins/alertzero/server/managed_workflows/detection_rule_workflows.test.ts
```

```bash
node scripts/jest src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/worker_reports.detection.test.ts
```

## Out of scope / fallbacks

- Spaces with more than 10,000 enabled rules need paging on step 0.
- An async `elasticsearch.esql.query` step would be the next lever if even the
  screen outgrows 30s on a huge window; the step type is sync-only today.
- Moving the totals into the review workflow would remove the per-iteration
  lookup but changes the child's input contract. Not done here.
