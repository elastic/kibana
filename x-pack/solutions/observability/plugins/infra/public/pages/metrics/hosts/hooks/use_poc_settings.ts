/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PoC-only — runtime toggles to switch each individual optimisation off so a
// single running build can compare "before vs. after" side by side. Lives
// behind a gear popover on the Hosts page (`<PocSettingsPopover>`); persists
// to localStorage so the choice survives page refreshes.
//
// REMOVE BEFORE PRODUCTION: these switches expose data-fetching code paths
// that we don't want users discovering as a real configuration knob. They
// exist to make perf comparisons reproducible during the Tier 3 PoC review.

import createContainer from 'constate';
import { useCallback, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const LOCAL_STORAGE_KEY = 'kibana.observability.hosts.poc_settings';

// Each flag corresponds to exactly one proposal in
// `/tmp/hosts-perf/PROPOSALS.md`. The keys are deliberately tied to the
// proposal IDs (P15a, P15c, P16-A, …) rather than a behavioural name so
// the link stays obvious as the proposals evolve.
interface PocSettings {
  // Metrics tab section
  // P16-A. ON → render every Metrics-tab tile through a Lens xy embeddable
  // backed by an ES|QL `STATS … BY host.name, BUCKET(...)` query. OFF →
  // fall back to the inventory-model-driven Lens DSL charts (the
  // pre-PoC main behaviour). Each ES|QL chart fires its own request when
  // Lens's IntersectionObserver-driven embeddable wakes up, so the
  // `perfTracker` records one sample per chart under
  // `PERF_KEYS.lensEsqlChart`.
  useLensEsqlMetricsCharts: boolean;

  // KPI tiles section
  // P15c. ON → render every KPI tile through a Lens `chartType: 'metric'`
  // embeddable backed by an ES|QL `STATS` query for the headline value
  // (trendline disabled — see `esql_kpi_chart.ts`). OFF → fall back to
  // the inventory-model formula configs which go through Lens's DSL
  // formula path. That's the pre-PoC main behaviour and the baseline for
  // the A/B comparison.
  useLensEsqlKpiCharts: boolean;
  // P15b. ON → bypass Lens entirely for the KPI strip and read four
  // scalar values from a dedicated server endpoint
  // (`POST /api/metrics/infra/host/kpis`) that runs *one* ES|QL `STATS`
  // (semconv) or *one* DSL `_search` with four sibling aggregations
  // (ECS). Tiles render through the pre-Lens `<MetricChartWrapper>`
  // (Elastic Charts `Metric`). Visual contract — header / value /
  // subtitle / tooltip — matches the other two paths so the toggle only
  // changes how the data is fetched. OFF → fall through to the
  // `useLensEsqlKpiCharts` / DSL Lens paths above.
  //
  // Strictly higher-precedence than `useLensEsqlKpiCharts` and
  // `kpiTrendline`: when this flag is on the entire Lens render path is
  // skipped (there's no Lens embeddable to feed a trendline into).
  useEsqlEndpointKpi: boolean;
  // P15a. ON → render the small sparkline behind each KPI headline number
  // (the inventory-model + main behaviour). OFF → drop the trendline so
  // the tile only renders the scalar headline.
  //
  // Independent of `useLensEsqlKpiCharts` for the DSL Lens path; the
  // ES|QL Lens path is hardcoded to no trendline, and the server-endpoint
  // path renders without a trendline by construction.
  kpiTrendline: boolean;

  // Cross-cutting plumbing section
  // P1. ON → flat `terms({ field: 'host.name', values: [...] })` for
  // multi-value host filters. OFF → OR-of-`match_phrase` (pre-P1 shape).
  useTermsFilter: boolean;
  // P2. ON → single-field KQL `host.name: ("a" or "b")` on the Open-in-
  // Alerts deep link. OFF → per-host OR'd clauses (pre-P2 shape).
  useConsolidatedKql: boolean;
  // P5. ON → drop the redundant outer `bool` wrap in
  // `InfraMetricsClient.search` when no excluded tier filter applies.
  // OFF → keep the wrap (sent server-side via `x-poc-legacy-bool-wrap`).
  useStrippedBoolWrap: boolean;
}

const DEFAULT_SETTINGS: PocSettings = {
  // Default OFF — the spike is opt-in for reviewers; turning it on by
  // default would replace the legacy inventory-model Lens charts with 11
  // ES|QL Lens embeddables on every page load and skew `perfTracker`
  // baselines.
  useLensEsqlMetricsCharts: false,
  // Default OFF — same rationale as `useLensEsqlMetricsCharts`. Flipping
  // this on swaps the 4 KPI tiles from the legacy formula path to one
  // ES|QL query per tile (4 in total). Reviewers turn it on to measure
  // the difference against the baseline.
  useLensEsqlKpiCharts: false,
  // Default OFF — opt-in third KPI render path for the A/B/C benchmark
  // matrix. Server endpoint + plain `<MetricChartWrapper>` indicator.
  useEsqlEndpointKpi: false,
  kpiTrendline: true,
  useTermsFilter: true,
  useConsolidatedKql: true,
  useStrippedBoolWrap: true,
};

// Side-channel mirror so non-React surfaces (the server-bound request
// header injection, pure-function filter builders) can read the same flags
// the React tree consumes. Updated by `<PocSettingsProvider>` via the
// `useSyncPocSettingsToModule` effect below; **do not write to this object
// from anywhere else**. Reads are racy by design — these are perf toggles
// for a PoC, not authorisation gates.
export const pocFlags = { ...DEFAULT_SETTINGS };

const hydrate = (stored: Partial<PocSettings> | undefined): PocSettings => {
  if (!stored) return DEFAULT_SETTINGS;
  return {
    useLensEsqlMetricsCharts:
      stored.useLensEsqlMetricsCharts ?? DEFAULT_SETTINGS.useLensEsqlMetricsCharts,
    useLensEsqlKpiCharts: stored.useLensEsqlKpiCharts ?? DEFAULT_SETTINGS.useLensEsqlKpiCharts,
    useEsqlEndpointKpi: stored.useEsqlEndpointKpi ?? DEFAULT_SETTINGS.useEsqlEndpointKpi,
    kpiTrendline: stored.kpiTrendline ?? DEFAULT_SETTINGS.kpiTrendline,
    useTermsFilter: stored.useTermsFilter ?? DEFAULT_SETTINGS.useTermsFilter,
    useConsolidatedKql: stored.useConsolidatedKql ?? DEFAULT_SETTINGS.useConsolidatedKql,
    useStrippedBoolWrap: stored.useStrippedBoolWrap ?? DEFAULT_SETTINGS.useStrippedBoolWrap,
  };
};

const usePocSettings = () => {
  const [stored, setStored] = useLocalStorage<Partial<PocSettings>>(
    LOCAL_STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  // `useLocalStorage` returns `undefined` on the very first render until the
  // hook hydrates from storage. Fall back to the defaults so consumers don't
  // have to thread a loading state through.
  const settings: PocSettings = useMemo(() => hydrate(stored), [stored]);

  // Single setter factory — every per-flag setter is "merge this key into
  // the persisted blob".
  const setSetting = useCallback(
    <K extends keyof PocSettings>(key: K, value: PocSettings[K]) => {
      setStored({ ...settings, [key]: value });
    },
    [setStored, settings]
  );

  const setUseLensEsqlMetricsCharts = useCallback(
    (value: boolean) => setSetting('useLensEsqlMetricsCharts', value),
    [setSetting]
  );
  const setUseLensEsqlKpiCharts = useCallback(
    (value: boolean) => setSetting('useLensEsqlKpiCharts', value),
    [setSetting]
  );
  const setUseEsqlEndpointKpi = useCallback(
    (value: boolean) => setSetting('useEsqlEndpointKpi', value),
    [setSetting]
  );
  const setKpiTrendline = useCallback(
    (value: boolean) => setSetting('kpiTrendline', value),
    [setSetting]
  );
  const setUseTermsFilter = useCallback(
    (value: boolean) => setSetting('useTermsFilter', value),
    [setSetting]
  );
  const setUseConsolidatedKql = useCallback(
    (value: boolean) => setSetting('useConsolidatedKql', value),
    [setSetting]
  );
  const setUseStrippedBoolWrap = useCallback(
    (value: boolean) => setSetting('useStrippedBoolWrap', value),
    [setSetting]
  );
  // Keep the module-level mirror in sync with the React state.
  useEffect(() => {
    Object.assign(pocFlags, settings);
  }, [settings]);

  return {
    ...settings,
    setUseLensEsqlMetricsCharts,
    setUseLensEsqlKpiCharts,
    setUseEsqlEndpointKpi,
    setKpiTrendline,
    setUseTermsFilter,
    setUseConsolidatedKql,
    setUseStrippedBoolWrap,
  };
};

export const PocSettings = createContainer(usePocSettings);
export const [PocSettingsProvider, usePocSettingsContext] = PocSettings;
