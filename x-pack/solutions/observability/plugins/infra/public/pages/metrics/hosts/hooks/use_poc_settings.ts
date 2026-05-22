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
//
// Why per-proposal toggles? The original implementation bundled the
// proposals into four group switches (KPI, Table, Metrics tab, Universal
// fixes). When the user spotted that flipping the "Universal" group
// dramatically improved KPI latency but slightly hurt table latency, it
// became impossible to tell *which* of P1 / P2 / P5 / P5.5 was the lever.
// Splitting every proposal into its own switch lets a reviewer measure each
// one's actual contribution to the page-load wall time, instead of treating
// the bundles as opaque.

import createContainer from 'constate';
import { useCallback, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const LOCAL_STORAGE_KEY = 'kibana.observability.hosts.poc_settings';

// Each flag corresponds to exactly one proposal in
// `/tmp/hosts-perf/PROPOSALS.md`. The keys are deliberately tied to the
// proposal IDs (P10, P11, …) rather than a behavioural name so the link
// stays obvious as the proposals evolve.
//
// Some flags are dependency-bound:
//   - `dropKpiTrendline` (P15a) only changes behaviour when
//     `useKpiEndpoint` (P15b) is OFF — when the new endpoint is on, the
//     trendline doesn't exist to begin with.
//   - `useServerSideSort`, `useScopedAlerts`, `useEsqlPhaseB` only change
//     behaviour when `useTwoPhaseFetch` (P10) is ON — the legacy path
//     doesn't route through any of them.
// The popover surfaces these dependencies inline so reviewers don't waste
// runs flipping a no-op switch.
interface PocSettings {
  // KPI tiles section
  // P15b. ON → `<HostKpiTiles>` driven by the single ES|QL endpoint. OFF →
  // the four legacy Lens `metric` charts.
  useKpiEndpoint: boolean;
  // P15a. ON → drop `trendLine: true` from the four legacy KPI Lens charts
  // (saves their second per-tile `date_histogram` aggregation). OFF →
  // restore the pre-P15 chart configs verbatim. Only effective when
  // `useKpiEndpoint=false`.
  dropKpiTrendline: boolean;

  // Hosts table section
  // P10. ON → two-phase fetch (Phase A `/host/list` cheap names + Phase B
  // `/host/metrics` per-page metrics). OFF → legacy single
  // `/api/metrics/infra/host` call with the full result returned.
  useTwoPhaseFetch: boolean;
  // P11. ON → server-side sort & pagination (Phase A sorts the entire fleet
  // by the chosen metric). OFF → server returns the fleet in default order
  // and the client sorts the visible page only — same shape as today's
  // unsupported-field fallback (alerts/title). Only effective with
  // `useTwoPhaseFetch=true`.
  useServerSideSort: boolean;
  // P5.6. ON → the alerts API is scoped to the visible page's host names
  // only (≤ 20). OFF → fetch alerts for every host in the Phase A result
  // (up to `limit`, e.g. 500). Only effective with `useTwoPhaseFetch=true`.
  useScopedAlerts: boolean;
  // P12. ON → Phase B uses a single ES|QL query when the schema is semconv
  // (`fetchSemconvHostsMetrics`). OFF → force the DSL fallback path even
  // for semconv. Only effective with `useTwoPhaseFetch=true` and the
  // semconv schema.
  useEsqlPhaseB: boolean;

  // Metrics tab section
  // P16. ON → eleven `@elastic/charts` line charts off a single ES|QL
  // `/host/metrics_timeseries` round-trip. OFF → eleven Lens xy embeddables,
  // each firing its own DSL aggregation.
  useMetricsTimeseriesEndpoint: boolean;

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
  // P5.5. ON → `isReady` gate suppresses the first-paint double-fetch on
  // the Hosts endpoints (waits for `metricsView?.dataViewReference` +
  // settled schema). OFF → fetches fire immediately on mount, before the
  // schema resolution lands, leading to the original double-fire pattern.
  useReadyGate: boolean;
}

const DEFAULT_SETTINGS: PocSettings = {
  useKpiEndpoint: true,
  dropKpiTrendline: true,
  useTwoPhaseFetch: true,
  useServerSideSort: true,
  useScopedAlerts: true,
  useEsqlPhaseB: true,
  useMetricsTimeseriesEndpoint: true,
  useTermsFilter: true,
  useConsolidatedKql: true,
  useStrippedBoolWrap: true,
  useReadyGate: true,
};

// Side-channel mirror so non-React surfaces (the server-bound request
// header injection, pure-function filter builders) can read the same flags
// the React tree consumes. Updated by `<PocSettingsProvider>` via the
// `useSyncPocSettingsToModule` effect below; **do not write to this object
// from anywhere else**. Reads are racy by design — these are perf toggles
// for a PoC, not authorisation gates.
export const pocFlags = { ...DEFAULT_SETTINGS };

// Migration shim — older localStorage payloads have the four-bundle shape
// (`useNewKpis` / `useNewTable` / `useNewMetricsTab` / `useUniversalFixes`).
// Translate them into the per-proposal shape on load so a reviewer who
// already has a localStorage entry from earlier in the PoC doesn't reset to
// all-defaults the moment we ship the split. New keys win when both are
// present.
type LegacyPocSettings = Partial<{
  useNewKpis: boolean;
  useNewTable: boolean;
  useNewMetricsTab: boolean;
  useUniversalFixes: boolean;
}>;

const hydrate = (stored: (Partial<PocSettings> & LegacyPocSettings) | undefined): PocSettings => {
  if (!stored) return DEFAULT_SETTINGS;
  return {
    useKpiEndpoint: stored.useKpiEndpoint ?? stored.useNewKpis ?? DEFAULT_SETTINGS.useKpiEndpoint,
    dropKpiTrendline:
      stored.dropKpiTrendline ?? stored.useNewKpis ?? DEFAULT_SETTINGS.dropKpiTrendline,
    useTwoPhaseFetch:
      stored.useTwoPhaseFetch ?? stored.useNewTable ?? DEFAULT_SETTINGS.useTwoPhaseFetch,
    useServerSideSort:
      stored.useServerSideSort ?? stored.useNewTable ?? DEFAULT_SETTINGS.useServerSideSort,
    useScopedAlerts:
      stored.useScopedAlerts ?? stored.useNewTable ?? DEFAULT_SETTINGS.useScopedAlerts,
    useEsqlPhaseB: stored.useEsqlPhaseB ?? stored.useNewTable ?? DEFAULT_SETTINGS.useEsqlPhaseB,
    useMetricsTimeseriesEndpoint:
      stored.useMetricsTimeseriesEndpoint ??
      stored.useNewMetricsTab ??
      DEFAULT_SETTINGS.useMetricsTimeseriesEndpoint,
    useTermsFilter:
      stored.useTermsFilter ?? stored.useUniversalFixes ?? DEFAULT_SETTINGS.useTermsFilter,
    useConsolidatedKql:
      stored.useConsolidatedKql ?? stored.useUniversalFixes ?? DEFAULT_SETTINGS.useConsolidatedKql,
    useStrippedBoolWrap:
      stored.useStrippedBoolWrap ??
      stored.useUniversalFixes ??
      DEFAULT_SETTINGS.useStrippedBoolWrap,
    useReadyGate: stored.useReadyGate ?? stored.useUniversalFixes ?? DEFAULT_SETTINGS.useReadyGate,
  };
};

const usePocSettings = () => {
  const [stored, setStored] = useLocalStorage<Partial<PocSettings> & LegacyPocSettings>(
    LOCAL_STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  // `useLocalStorage` returns `undefined` on the very first render until the
  // hook hydrates from storage. Fall back to the defaults so consumers don't
  // have to thread a loading state through.
  const settings: PocSettings = useMemo(() => hydrate(stored), [stored]);

  // Single setter factory — every per-flag setter is "merge this key into
  // the persisted blob". Eleven near-identical closures collapses into one
  // returned helper that consumers wrap in a per-flag `useCallback`.
  const setSetting = useCallback(
    <K extends keyof PocSettings>(key: K, value: PocSettings[K]) => {
      setStored({ ...settings, [key]: value });
    },
    [setStored, settings]
  );

  const setUseKpiEndpoint = useCallback(
    (value: boolean) => setSetting('useKpiEndpoint', value),
    [setSetting]
  );
  const setDropKpiTrendline = useCallback(
    (value: boolean) => setSetting('dropKpiTrendline', value),
    [setSetting]
  );
  const setUseTwoPhaseFetch = useCallback(
    (value: boolean) => setSetting('useTwoPhaseFetch', value),
    [setSetting]
  );
  const setUseServerSideSort = useCallback(
    (value: boolean) => setSetting('useServerSideSort', value),
    [setSetting]
  );
  const setUseScopedAlerts = useCallback(
    (value: boolean) => setSetting('useScopedAlerts', value),
    [setSetting]
  );
  const setUseEsqlPhaseB = useCallback(
    (value: boolean) => setSetting('useEsqlPhaseB', value),
    [setSetting]
  );
  const setUseMetricsTimeseriesEndpoint = useCallback(
    (value: boolean) => setSetting('useMetricsTimeseriesEndpoint', value),
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
  const setUseReadyGate = useCallback(
    (value: boolean) => setSetting('useReadyGate', value),
    [setSetting]
  );

  // Keep the module-level mirror in sync with the React state.
  useEffect(() => {
    Object.assign(pocFlags, settings);
  }, [settings]);

  return {
    ...settings,
    setUseKpiEndpoint,
    setDropKpiTrendline,
    setUseTwoPhaseFetch,
    setUseServerSideSort,
    setUseScopedAlerts,
    setUseEsqlPhaseB,
    setUseMetricsTimeseriesEndpoint,
    setUseTermsFilter,
    setUseConsolidatedKql,
    setUseStrippedBoolWrap,
    setUseReadyGate,
  };
};

export const PocSettings = createContainer(usePocSettings);
export const [PocSettingsProvider, usePocSettingsContext] = PocSettings;
