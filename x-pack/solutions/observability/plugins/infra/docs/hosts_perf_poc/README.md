# Hosts UI performance PoC — benchmark artifacts

Companion to [PR #270425](https://github.com/elastic/kibana/pull/270425). Captures the design + measurement work behind the toggle-able PoC paths (P15a/b/c and P16-A) that ship in that branch. Nothing here is loaded at runtime — these are notes, scripts and raw measurements for reviewers.

## Files

- [`REPORT.md`](./REPORT.md) — the forensic measurement report on the legacy Hosts UI behaviour: per-stage `took`/Node breakdowns, the `terms`-cap ordering analysis, the APM-host coverage matrix, the semconv-specific `state`-sub-agg multiplier, and the duplicate first-paint waste. This is the empirical input that the proposals below were built against. Originally published as a [comment on observability-dev#5590](https://github.com/elastic/observability-dev/issues/5590#issuecomment-4499497658); kept here for offline reading.
- [`PROPOSALS.md`](./PROPOSALS.md) — the forward-looking proposals catalogue: every change we considered (P1…P16), the design rationale for each, expected mechanical effect, trade-offs and code references. Strictly hypotheses — PoC outcomes (what was tried and what shipped) live in the [outcomes comment](https://github.com/elastic/observability-dev/issues/5590#issuecomment-4563528163) on the same PoC issue.
- [`ESQL_CAVEATS.md`](./ESQL_CAVEATS.md) — the ES|QL footguns we ran into while building P15b/c and P16-A (filter-in-aggregation cost, `TS` command limitations, `SET approximate`, trendline support, etc.). Worth reading if you're building anything else on ES|QL inside Kibana.
- [`kpi_bench_v2.mjs`](./kpi_bench_v2.mjs) — the server-side bench script. Runs six query shapes (legacy DSL with/without trendline, four ES|QL variants) against a populated cluster, clears caches between runs, reports wall + ES `took_sum` medians. Used to isolate which ES|QL feature actually moves the needle.
- [`metrics/`](./metrics) — raw output captured during the final local benchmark pass:
  - `bench_v2_local_1500x24h.txt` — server-side bench (`kpi_bench_v2.mjs`) output.
  - `journey_<scenario>.txt` — one file per synthtrace scenario, contains only the `[journey-metric]` lines emitted by [`infra_hosts_view_tier1_poc.ts`][journey] (the perf-mark instrumentation in `kpi_charts.tsx`, `use_hosts_kpis.ts`, `use_hosts_view.ts`, `use_host_count.ts`).

## How to reproduce

### Server-side bench (~30 s for 6 scenarios × 5 cold runs)

Requires a populated cluster (any of the synthtrace scenarios below). Default uses 1500 hosts × 24 h on local ES — override the env vars if you're hitting a deploy.

```bash
ES_URL=http://localhost:9200 \
ES_USER=elastic \
ES_PASS=changeme \
INDEX='metrics-hostmetricsreceiver.otel-*' \
FROM='2026-05-27T13:30:00Z' \
TO='2026-05-28T13:00:00Z' \
LIMIT=1500 \
RUNS=5 \
node x-pack/solutions/observability/plugins/infra/docs/hosts_perf_poc/kpi_bench_v2.mjs
```

### End-to-end bench (kbn-journey, ~10 min for 7 PoC configs × one scenario)

1. **Ingest data.** Pick a [synthtrace scenario][synthtrace-scenarios] and run it against a local Kibana:

   ```bash
   node scripts/synthtrace.js hosts_semconv_tsds \
     --target=http://elastic:changeme@localhost:9200 \
     --kibana=http://elastic:changeme@localhost:5601 \
     --from=now-24h --to=now \
     --scenarioOpts=hosts=1500 \
     --workers=1 --concurrency=1
   ```

   Available scenarios: `hosts_semconv_tsds`, `hosts_semconv_no_tsds`, `hosts_ecs_only`, `hosts_mixed_semconv_ecs`, `hosts_apm_only`, `hosts_apm_plus_semconv`. All scoped to 1500 hosts × 24 h at a 5-minute sampling interval by default.

2. **Stop Kibana** (the FTR starts its own).

3. **Run the journey:**

   ```bash
   TEST_ES_URL='http://elastic:changeme@localhost:9200' \
   TEST_ES_DISABLE_STARTUP=true \
   TEST_INGEST_ES_DATA=false \
   TEST_PERFORMANCE_PHASE=TEST \
   NODE_OPTIONS="--max-old-space-size=8192" \
   node scripts/functional_tests \
     --config x-pack/performance/journeys_e2e/infra_hosts_view_tier1_poc.ts
   ```

4. **Read the output.** Each `[journey-metric]` line is one measure for one config:

   ```
   [journey-metric] config=baseline-main name=infra.hosts.kpiReadyDuration  duration_ms=53614
   [journey-metric] config=p15b          name=infra.hosts.kpiReadyDuration  duration_ms=406
   ```

   Three measures are emitted per config: `hostCountReadyDuration`, `tableReadyDuration`, `kpiReadyDuration`. `metricsTabReadyDuration` is non-fatal (the gating condition is unreliable — see the journey file for context).

[journey]: ../../../../../../performance/journeys_e2e/infra_hosts_view_tier1_poc.ts
[synthtrace-scenarios]: ../../../../../../../src/platform/packages/shared/kbn-synthtrace/src/scenarios

## Known issues hit during this work

- `hosts_apm_only` and `hosts_apm_plus_semconv` crash synthtrace at end-of-stream with `RangeError: Maximum call stack size exceeded` in `create_metric_aggregator_factory.ts:53` (the recursive `flush` exhausts the stack when too many metrics accumulate). The semconv half of `apm_plus_semconv` still gets indexed (1.7 M docs, 750 hosts), so the journey can still run against the partial fixture. `apm_only` gets 4.2 M traces + APM metrics in but the Hosts UI can't render a table from APM-only data, so the journey perf marks never fire.
- The Lens KPI `onLoad(false)` event sometimes fires for a tile before `afterLoadedState.charts` resolves from `0 → 4`. The tracker in `kpi_charts.tsx` handles this with a `Set` + `useEffect` re-check; we hit the race the first time when only `tier1` (the slowest path) was reporting a measure.
- `metricsTabReadyDuration` (all 11 Metrics-tab Lens charts complete) is unreliable: a single embeddable getting stuck on `onLoad` stalls the counter. The journey treats it as non-fatal and logs a diagnostic snapshot on timeout.
