/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PoC-only — runtime toggles to switch each optimisation off so a single
// running build can compare "before vs. after" side by side. Lives behind a
// gear popover on the Hosts page (`<PocSettingsPopover>`); persists to
// localStorage so the choice survives page refreshes.
//
// REMOVE BEFORE PRODUCTION: the two switches expose data-fetching code
// paths that we don't want users discovering as a real configuration knob.
// They exist to make perf comparisons reproducible during the Tier 3 PoC
// review.

import createContainer from 'constate';
import { useCallback, useEffect } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const LOCAL_STORAGE_KEY = 'kibana.observability.hosts.poc_settings';

interface PocSettings {
  // P15a + P15b. ON → `<HostKpiTiles>` driven by the single ES|QL endpoint
  // (no trendline). OFF → the legacy four Lens charts with `trendLine: true`
  // restored on the chart configs at render time, so the comparison sees the
  // full pre-P15 cost.
  useNewKpis: boolean;
  // P10 + P11 + P12 (semconv) + P5.6. ON → two-phase Phase A / Phase B
  // fetch with server-side sort + pagination and per-page alerts scoping.
  // OFF → the legacy single `/api/metrics/infra/host` call with client-side
  // sort and pagination over the full result, matching what shipped before
  // this PR.
  useNewTable: boolean;
  // P1 + P2 + P5 + P5.5. The cross-cutting plumbing wins that aren't tied
  // to the table or KPI architectures. ON → flat `terms` filters, `field: (a
  // or b)` KQL, the request gate that suppresses the first-paint double
  // fetch, and the server-side bool-wrap drop. OFF → restore the original
  // shapes so the comparison includes their cost. P3 is a no-op decision
  // (kept `top_metrics` after measuring) so there's nothing to flip there.
  useUniversalFixes: boolean;
}

const DEFAULT_SETTINGS: PocSettings = {
  useNewKpis: true,
  useNewTable: true,
  useUniversalFixes: true,
};

// Side-channel mirror so non-React surfaces (the server-bound request
// header injection, pure-function filter builders) can read the same flags
// the React tree consumes. Updated by `<PocSettingsProvider>` via the
// `useSyncPocSettingsToModule` effect below; **do not write to this object
// from anywhere else**. Reads are racy by design — these are perf toggles
// for a PoC, not authorisation gates.
export const pocFlags = { ...DEFAULT_SETTINGS };

const usePocSettings = () => {
  const [stored, setStored] = useLocalStorage<PocSettings>(LOCAL_STORAGE_KEY, DEFAULT_SETTINGS);

  // `useLocalStorage` returns `undefined` on the very first render until the
  // hook hydrates from storage. Fall back to the defaults so consumers don't
  // have to thread a loading state through.
  const settings: PocSettings = stored ?? DEFAULT_SETTINGS;

  const setUseNewKpis = useCallback(
    (value: boolean) => setStored({ ...settings, useNewKpis: value }),
    [setStored, settings]
  );
  const setUseNewTable = useCallback(
    (value: boolean) => setStored({ ...settings, useNewTable: value }),
    [setStored, settings]
  );
  const setUseUniversalFixes = useCallback(
    (value: boolean) => setStored({ ...settings, useUniversalFixes: value }),
    [setStored, settings]
  );

  // Keep the module-level mirror in sync with the React state.
  useEffect(() => {
    pocFlags.useNewKpis = settings.useNewKpis;
    pocFlags.useNewTable = settings.useNewTable;
    pocFlags.useUniversalFixes = settings.useUniversalFixes;
  }, [settings.useNewKpis, settings.useNewTable, settings.useUniversalFixes]);

  return {
    useNewKpis: settings.useNewKpis,
    useNewTable: settings.useNewTable,
    useUniversalFixes: settings.useUniversalFixes,
    setUseNewKpis,
    setUseNewTable,
    setUseUniversalFixes,
  };
};

export const PocSettings = createContainer(usePocSettings);
export const [PocSettingsProvider, usePocSettingsContext] = PocSettings;
